'use server';

import { generateText, type UIMessage } from 'ai';
import { cookies } from 'next/headers';
import {
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
  updateChatVisiblityById,
  updateChatTitleById,
  getPromptsByUserId,
  getDefaultPrompts,
  updatePrompt,
  deletePrompt,
  createPrompt,
  reorderPrompts,
} from '@/lib/db/queries';
import type { VisibilityType } from '@/components/visibility-selector';
import { myProvider } from '@/lib/ai/providers';
import { auth } from '@/app/(auth)/auth';

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set('chat-model', model);
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: UIMessage;
}) {
  const { text: response } = await generateText({
    model: myProvider.languageModel('title-model'),
    system: `\n
    - you will generate a short title based on the first message a user begins a conversation with
    - ensure it is not more than 80 characters long
    - the title should be a summary of the user's message
    - do not use quotes or colons
    - IMPORTANT: Start your response with a single relevant emoji followed by a space, then the title
    - Choose an emoji that best represents the topic or nature of the conversation
    - Examples: "📊 Data Analysis Help", "🔧 Programming Question", "✍️ Writing Assistance", "🎨 Creative Ideas"`,
    prompt: JSON.stringify(message),
  });

  // Ensure the response starts with an emoji and space
  if (!/^[\p{Emoji}]\s/u.test(response)) {
    // If no emoji is present, add a default one
    return `${response}`;
  }

  return response;
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const messages = await getMessageById({ id });

  if (!messages || messages.length === 0) {
    throw new Error(`Message with id ${id} not found`);
  }

  const message = messages[0];

  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  await updateChatVisiblityById({ chatId, visibility });
}

export async function updateChatTitle({
  chatId,
  title,
}: {
  chatId: string;
  title: string;
}) {
  await updateChatTitleById({ chatId, title });
}

export async function getUserPrompts() {
  const session = await auth();

  if (!session?.user?.id) {
    // Return default prompts for non-authenticated users or fallback
    try {
      const defaultPrompts = await getDefaultPrompts();
      return defaultPrompts.sort((a, b) => {
        const orderA = Number.parseInt(a.order) || 0;
        const orderB = Number.parseInt(b.order) || 0;
        return orderA === orderB
          ? a.order.localeCompare(b.order)
          : orderA - orderB;
      });
    } catch (error) {
      console.error('Failed to get default prompts:', error);
      return [];
    }
  }

  try {
    // Get user-specific prompts
    const userPrompts = await getPromptsByUserId({ userId: session.user.id });

    // If user has no prompts, return default prompts as fallback
    if (userPrompts.length === 0) {
      const defaultPrompts = await getDefaultPrompts();
      // Ensure default prompts are sorted by order field with numeric comparison
      return defaultPrompts.sort((a, b) => {
        const orderA = Number.parseInt(a.order) || 0;
        const orderB = Number.parseInt(b.order) || 0;
        return orderA === orderB
          ? a.order.localeCompare(b.order)
          : orderA - orderB;
      });
    }

    // Ensure user prompts are sorted by order field with numeric comparison (extra safety)
    return userPrompts.sort((a, b) => {
      const orderA = Number.parseInt(a.order) || 0;
      const orderB = Number.parseInt(b.order) || 0;
      return orderA === orderB
        ? a.order.localeCompare(b.order)
        : orderA - orderB;
    });
  } catch (error) {
    console.error('Failed to get user prompts:', error);
    // Return default prompts as fallback
    try {
      const defaultPrompts = await getDefaultPrompts();
      return defaultPrompts.sort((a, b) => a.order.localeCompare(b.order));
    } catch (fallbackError) {
      console.error(
        'Failed to get default prompts as fallback:',
        fallbackError,
      );
      return [];
    }
  }
}

export async function updateUserPrompt({
  id,
  title,
  prompt,
  modelId,
}: {
  id: string;
  title: string;
  prompt: string;
  modelId?: string;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('User must be authenticated to update prompts');
  }

  try {
    return await updatePrompt({
      id,
      title,
      prompt,
      modelId: modelId || undefined,
    });
  } catch (error) {
    console.error('Failed to update prompt:', error);
    throw new Error('Failed to update prompt');
  }
}

export async function deleteUserPrompt({ id }: { id: string }) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('User must be authenticated to delete prompts');
  }

  try {
    return await deletePrompt({ id });
  } catch (error) {
    console.error('Failed to delete prompt:', error);
    throw new Error('Failed to delete prompt');
  }
}

export async function createUserPrompt({
  title,
  prompt,
  modelId,
}: {
  title: string;
  prompt: string;
  modelId?: string;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('User must be authenticated to create prompts');
  }

  try {
    return await createPrompt({
      title: title.trim(),
      prompt: prompt.trim(),
      modelId: modelId || undefined,
      userId: session.user.id,
    });
  } catch (error) {
    console.error('Failed to create prompt:', error);
    throw new Error('Failed to create prompt');
  }
}

export async function reorderUserPrompts({
  userId,
  promptId,
  newOrder,
}: {
  userId: string;
  promptId: string;
  newOrder: string;
}) {
  const session = await auth();

  if (!session?.user?.id || session.user.id !== userId) {
    throw new Error('Unauthorized');
  }

  try {
    return await reorderPrompts({
      userId,
      promptId,
      newOrder,
    });
  } catch (error) {
    console.error('Failed to reorder prompt:', error);
    throw new Error('Failed to reorder prompt');
  }
}

export async function bulkReorderUserPrompts({
  userId,
  promptOrders,
}: {
  userId: string;
  promptOrders: { id: string; order: string }[];
}) {
  const session = await auth();

  if (!session?.user?.id || session.user.id !== userId) {
    throw new Error('Unauthorized');
  }

  try {
    const { bulkReorderPrompts } = await import('@/lib/db/queries');
    return await bulkReorderPrompts({
      userId,
      promptOrders,
    });
  } catch (error) {
    console.error('Failed to bulk reorder prompts:', error);
    throw new Error('Failed to bulk reorder prompts');
  }
}
