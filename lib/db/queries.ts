import 'server-only';

import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lt,
  type SQL,
} from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import {
  user,
  chat,
  type User,
  document,
  type Suggestion,
  suggestion,
  message,
  vote,
  type DBMessage,
  type Chat,
  stream,
  allowedUser,
  prompt,
  type Prompt,
} from './schema';
import type { ArtifactKind } from '@/components/artifact';
import { deleteFileFromS3 } from '@/lib/s3';
import type { Attachment } from '@/lib/types';
import { generateUUID } from '../utils';
import { generateHashedPassword } from './utils';
import type { VisibilityType } from '@/components/visibility-selector';
import { ChatSDKError } from '../errors';

// Helper function to generate lexicographically ordered strings for drag and drop
function generateNextOrder(order: string): string {
  // Convert to number, increment by 1000, and convert back to string for simple ordering
  const num = Number.parseInt(order) || 0;
  return (num + 1000).toString();
}

function generateOrderBetween(orderA: string, orderB: string): string {
  const numA = Number.parseInt(orderA) || 0;
  const numB = Number.parseInt(orderB) || 0;
  const mid = Math.floor((numA + numB) / 2);

  // If the numbers are consecutive, multiply by 1000 to create space
  if (numB - numA <= 1) {
    return (numA * 1000 + 500).toString();
  }

  return mid.toString();
}

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get user by email',
    );
  }
}

export async function createUser(
  email: string,
  password: string,
  role: 'user' | 'admin' = 'user',
) {
  const hashedPassword = generateHashedPassword(password);

  try {
    const result = await db
      .insert(user)
      .values({ email, password: hashedPassword, role })
      .returning();

    // Automatically create default prompts for the new user
    if (result.length > 0) {
      const userId = result[0].id;
      try {
        // Import dynamically to avoid circular dependencies
        const { createPromptsForNewUser } = await import(
          '@/scripts/seed-default-prompts'
        );
        await createPromptsForNewUser(userId);
      } catch (promptError) {
        // Log error but don't fail user creation
        console.error(
          'Failed to create default prompts for new user:',
          promptError,
        );
      }
    }

    return result;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to create user');
  }
}

export async function createGuestUser() {
  const email = `guest-${Date.now()}`;
  const password = generateHashedPassword(generateUUID());

  try {
    const result = await db.insert(user).values({ email, password }).returning({
      id: user.id,
      email: user.email,
    });

    // Automatically create default prompts for the new guest user
    if (result.length > 0) {
      const userId = result[0].id;
      try {
        // Import dynamically to avoid circular dependencies
        const { createPromptsForNewUser } = await import(
          '@/scripts/seed-default-prompts'
        );
        await createPromptsForNewUser(userId);
      } catch (promptError) {
        // Log error but don't fail user creation
        console.error(
          'Failed to create default prompts for new guest user:',
          promptError,
        );
      }
    }

    return result;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create guest user',
    );
  }
}

export async function saveChat({
  id,
  userId,
  title,
  visibility,
  hidden = false,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
  hidden?: boolean;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
      visibility,
      hidden,
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save chat');
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    console.log(`Soft deleting chat by setting hidden=true: ${id}`);

    // Instead of actually deleting, just set the hidden flag to true
    const [hiddenChat] = await db
      .update(chat)
      .set({ hidden: true })
      .where(eq(chat.id, id))
      .returning();
    
    console.log(`Successfully soft deleted chat: ${id}`);
    return hiddenChat;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete chat by id',
    );
  }
}

export async function hardDeleteChatById({ id }: { id: string }) {
  try {
    console.log(`Starting hard deletion of chat: ${id}`);

    // First, get all messages with attachments for this chat
    const messagesWithAttachments = await db
      .select({ attachments: message.attachments })
      .from(message)
      .where(eq(message.chatId, id));

    console.log(
      `Found ${messagesWithAttachments.length} messages for chat ${id}`,
    );

    // Extract all S3 keys from attachments
    const s3KeysToDelete: string[] = [];
    for (const messageRecord of messagesWithAttachments) {
      const attachments = messageRecord.attachments as Attachment[];
      console.log(`Message attachments:`, JSON.stringify(attachments, null, 2));

      if (Array.isArray(attachments)) {
        for (const attachment of attachments) {
          if (attachment.s3Key) {
            // Decode URL-encoded characters to get the actual S3 key
            const decodedKey = decodeURIComponent(attachment.s3Key);
            console.log(
              `Adding S3 key to delete: ${attachment.s3Key} -> decoded: ${decodedKey}`,
            );
            s3KeysToDelete.push(decodedKey);
          } else {
            console.log(`No S3 key found for attachment:`, attachment);
          }
        }
      } else {
        console.log(
          `Attachments is not an array:`,
          typeof attachments,
          attachments,
        );
      }
    }

    console.log(
      `Hard deletion: Found ${s3KeysToDelete.length} S3 files to delete:`,
      s3KeysToDelete,
    );

    // Delete files from S3
    const deletePromises = s3KeysToDelete.map((key) =>
      deleteFileFromS3(key)
        .then(() => {
          console.log(`Successfully deleted S3 file: ${key}`);
        })
        .catch((error) => {
          // Log error but don't fail the entire operation
          console.error(`Failed to delete S3 file with key ${key}:`, error);
        }),
    );

    // Wait for all S3 deletions to complete (or fail gracefully)
    await Promise.allSettled(deletePromises);

    // Then delete database records
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));
    await db.delete(stream).where(eq(stream.chatId, id));

    const [chatsDeleted] = await db
      .delete(chat)
      .where(eq(chat.id, id))
      .returning();
    
    console.log(`Successfully hard deleted chat: ${id}`);
    return chatsDeleted;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to hard delete chat by id',
    );
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<any>) =>
      db
        .select()
        .from(chat)
        .where(
          whereCondition
            ? and(whereCondition, eq(chat.userId, id), eq(chat.hidden, false))
            : and(eq(chat.userId, id), eq(chat.hidden, false)),
        )
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Array<Chat> = [];

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          'not_found:database',
          `Chat with id ${startingAfter} not found`,
        );
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          'not_found:database',
          `Chat with id ${endingBefore} not found`,
        );
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get chats by user id',
    );
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get chat by id');
  }
}

export async function saveMessages({
  messages,
}: {
  messages: Array<DBMessage>;
}) {
  try {
    return await db.insert(message).values(messages);
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save messages');
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get messages by chat id',
    );
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === 'up' })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === 'up',
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to vote message');
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get votes by chat id',
    );
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    return await db
      .insert(document)
      .values({
        id,
        title,
        kind,
        content,
        userId,
        createdAt: new Date(),
      })
      .returning();
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save document');
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get documents by id',
    );
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get document by id',
    );
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp),
        ),
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
      .returning();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete documents by id after timestamp',
    );
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to save suggestions',
    );
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get suggestions by document id',
    );
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get message by id',
    );
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id, attachments: message.attachments })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)),
      );

    // Extract S3 keys from attachments that will be deleted
    const s3KeysToDelete: string[] = [];
    for (const messageRecord of messagesToDelete) {
      const attachments = messageRecord.attachments as Attachment[];
      if (Array.isArray(attachments)) {
        for (const attachment of attachments) {
          if (attachment.s3Key) {
            // Decode URL-encoded characters to get the actual S3 key
            const decodedKey = decodeURIComponent(attachment.s3Key);
            s3KeysToDelete.push(decodedKey);
          }
        }
      }
    }

    // Delete files from S3
    const deletePromises = s3KeysToDelete.map((key) =>
      deleteFileFromS3(key).catch((error) => {
        // Log error but don't fail the entire operation
        console.error(`Failed to delete S3 file with key ${key}:`, error);
      }),
    );

    // Wait for all S3 deletions to complete (or fail gracefully)
    await Promise.allSettled(deletePromises);

    const messageIds = messagesToDelete.map((message) => message.id);

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds)),
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds)),
        );
    }
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete messages by chat id after timestamp',
    );
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update chat visibility by id',
    );
  }
}

export async function updateChatTitleById({
  chatId,
  title,
}: {
  chatId: string;
  title: string;
}) {
  try {
    return await db.update(chat).set({ title }).where(eq(chat.id, chatId));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update chat title by id',
    );
  }
}

export async function updateChatHiddenById({
  chatId,
  hidden,
}: {
  chatId: string;
  hidden: boolean;
}) {
  try {
    return await db.update(chat).set({ hidden }).where(eq(chat.id, chatId));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update chat hidden status by id',
    );
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: { id: string; differenceInHours: number }) {
  try {
    const twentyFourHoursAgo = new Date(
      Date.now() - differenceInHours * 60 * 60 * 1000,
    );

    const [stats] = await db
      .select({ count: count(message.id) })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(chat.userId, id),
          gte(message.createdAt, twentyFourHoursAgo),
          eq(message.role, 'user'),
        ),
      )
      .execute();

    return stats?.count ?? 0;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get message count by user id',
    );
  }
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  try {
    await db
      .insert(stream)
      .values({ id: streamId, chatId, createdAt: new Date() });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create stream id',
    );
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const streamIds = await db
      .select({ id: stream.id })
      .from(stream)
      .where(eq(stream.chatId, chatId))
      .orderBy(asc(stream.createdAt))
      .execute();

    return streamIds.map(({ id }) => id);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get stream ids by chat id',
    );
  }
}

export async function isEmailAllowed(email: string): Promise<boolean> {
  try {
    const [allowedUserRecord] = await db
      .select()
      .from(allowedUser)
      .where(eq(allowedUser.email, email));

    return !!allowedUserRecord;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to check if email is allowed',
    );
  }
}

export async function addAllowedUser(email: string) {
  try {
    return await db.insert(allowedUser).values({ email });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to add allowed user',
    );
  }
}

export async function getUserRole(
  email: string,
): Promise<'user' | 'admin' | null> {
  try {
    const [selectedUser] = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.email, email));

    return selectedUser?.role ?? null;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get user role');
  }
}

export async function updateUserRole(email: string, role: 'user' | 'admin') {
  try {
    return await db.update(user).set({ role }).where(eq(user.email, email));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update user role',
    );
  }
}

export async function getAllUsers() {
  try {
    return await db
      .select({ id: user.id, email: user.email, role: user.role })
      .from(user);
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get all users');
  }
}

export async function getPromptsByUserId({ userId }: { userId: string }) {
  try {
    return await db
      .select()
      .from(prompt)
      .where(eq(prompt.userId, userId))
      .orderBy(asc(prompt.order), asc(prompt.createdAt));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get prompts by user id',
    );
  }
}

export async function getDefaultPrompts() {
  try {
    return await db
      .select()
      .from(prompt)
      .where(eq(prompt.isDefault, true))
      .orderBy(asc(prompt.order), asc(prompt.createdAt));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get default prompts',
    );
  }
}

export async function createPrompt({
  title,
  prompt: promptText,
  modelId,
  userId,
  order,
  isDefault = false,
}: {
  title: string;
  prompt: string;
  modelId?: string;
  userId: string;
  order?: string;
  isDefault?: boolean;
}) {
  try {
    // If no order is provided, calculate next order based on existing prompts
    let finalOrder = order;
    if (!finalOrder) {
      const existingPrompts = await db
        .select({ order: prompt.order })
        .from(prompt)
        .where(eq(prompt.userId, userId))
        .orderBy(asc(prompt.order));

      if (existingPrompts.length === 0) {
        finalOrder = '1';
      } else {
        // Generate next order using lexicographic ordering
        const maxOrder = existingPrompts[existingPrompts.length - 1].order;
        finalOrder = generateNextOrder(maxOrder);
      }
    }

    return await db
      .insert(prompt)
      .values({
        title,
        prompt: promptText,
        modelId,
        userId,
        order: finalOrder,
        isDefault,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to create prompt');
  }
}

export async function updatePrompt({
  id,
  title,
  prompt: promptText,
  modelId,
  order,
}: {
  id: string;
  title?: string;
  prompt?: string;
  modelId?: string;
  order?: string;
}) {
  try {
    const updateValues: Partial<Prompt> = {
      updatedAt: new Date(),
    };

    if (title !== undefined) updateValues.title = title;
    if (promptText !== undefined) updateValues.prompt = promptText;
    if (modelId !== undefined) updateValues.modelId = modelId;
    if (order !== undefined) updateValues.order = order;

    return await db
      .update(prompt)
      .set(updateValues)
      .where(eq(prompt.id, id))
      .returning();
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to update prompt');
  }
}

export async function deletePrompt({ id }: { id: string }) {
  try {
    return await db.delete(prompt).where(eq(prompt.id, id)).returning();
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to delete prompt');
  }
}

export async function deleteAllUserPrompts({ userId }: { userId: string }) {
  try {
    return await db.delete(prompt).where(eq(prompt.userId, userId)).returning();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete all user prompts',
    );
  }
}

export async function reorderPrompts({
  userId,
  promptId,
  newOrder,
}: {
  userId: string;
  promptId: string;
  newOrder: string;
}) {
  try {
    return await db
      .update(prompt)
      .set({
        order: newOrder,
        updatedAt: new Date(),
      })
      .where(and(eq(prompt.id, promptId), eq(prompt.userId, userId)))
      .returning();
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to reorder prompt');
  }
}

export async function bulkReorderPrompts({
  userId,
  promptOrders,
}: {
  userId: string;
  promptOrders: { id: string; order: string }[];
}) {
  try {
    const updates = promptOrders.map(({ id, order }) =>
      db
        .update(prompt)
        .set({
          order,
          updatedAt: new Date(),
        })
        .where(and(eq(prompt.id, id), eq(prompt.userId, userId))),
    );

    await Promise.all(updates);
    return { success: true };
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to bulk reorder prompts',
    );
  }
}

export async function bulkCreatePrompts({
  prompts,
}: {
  prompts: Array<Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>>;
}) {
  try {
    const now = new Date();
    const promptsWithTimestamps = prompts.map((p) => ({
      ...p,
      createdAt: now,
      updatedAt: now,
    }));

    return await db.insert(prompt).values(promptsWithTimestamps).returning();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to bulk create prompts',
    );
  }
}
