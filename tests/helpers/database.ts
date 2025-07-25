import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import {
  allowedUser,
  user,
  chat,
  message,
  messageDeprecated,
  vote,
  voteDeprecated,
  document,
  suggestion,
  stream,
  prompt,
} from '../../lib/db/schema';
import { generateHashedPassword } from '../../lib/db/utils';

// Load environment variables
config({
  path: '.env.local',
});

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is required');
}

const client = postgres(process.env.POSTGRES_URL);
const db = drizzle(client);

// Add retry functionality for database operations
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 100,
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
    }
  }
  throw new Error('Max retries exceeded');
}

let connectionClosed = false;

export async function addAllowedUserToDB(email: string): Promise<void> {
  return retryOperation(async () => {
    try {
      await db.insert(allowedUser).values({ email });
    } catch (error) {
      if (error instanceof Error && error.message.includes('duplicate key')) {
        // User already exists, which is fine
        return;
      }
      throw error;
    }
  });
}

export async function removeAllowedUserFromDB(email: string): Promise<void> {
  return retryOperation(async () => {
    await db.delete(allowedUser).where(eq(allowedUser.email, email));
  });
}

export async function isEmailAllowedInDB(email: string): Promise<boolean> {
  return retryOperation(async () => {
    const [allowedUserRecord] = await db
      .select()
      .from(allowedUser)
      .where(eq(allowedUser.email, email));

    return !!allowedUserRecord;
  });
}

export async function closeDatabaseConnection(): Promise<void> {
  if (!connectionClosed) {
    await client.end();
    connectionClosed = true;
  }
}

export async function deleteUserWithConstraints(email: string): Promise<void> {
  return retryOperation(async () => {
    try {
      // First, find the user by email
      const [userRecord] = await db
        .select()
        .from(user)
        .where(eq(user.email, email));

      if (!userRecord) {
        console.log(`User with email ${email} not found`);
        return;
      }

      const userId = userRecord.id;

      // Get all chats for this user to cascade delete related data
      const userChats = await db
        .select()
        .from(chat)
        .where(eq(chat.userId, userId));

      const chatIds = userChats.map((c) => c.id);

      // Delete in proper order to respect foreign key constraints

      // 1. Delete votes (both v1 and v2)
      for (const chatId of chatIds) {
        await db
          .delete(voteDeprecated)
          .where(eq(voteDeprecated.chatId, chatId));
        await db.delete(vote).where(eq(vote.chatId, chatId));
      }

      // 2. Delete messages (both v1 and v2)
      for (const chatId of chatIds) {
        await db
          .delete(messageDeprecated)
          .where(eq(messageDeprecated.chatId, chatId));
        await db.delete(message).where(eq(message.chatId, chatId));
      }

      // 3. Delete streams
      for (const chatId of chatIds) {
        await db.delete(stream).where(eq(stream.chatId, chatId));
      }

      // 4. Delete suggestions related to user's documents
      await db.delete(suggestion).where(eq(suggestion.userId, userId));

      // 5. Delete documents
      await db.delete(document).where(eq(document.userId, userId));

      // 6. Delete prompts
      await db.delete(prompt).where(eq(prompt.userId, userId));

      // 7. Delete chats
      await db.delete(chat).where(eq(chat.userId, userId));

      // 8. Delete the user
      await db.delete(user).where(eq(user.id, userId));

      // 9. Remove from allowed users table
      await db.delete(allowedUser).where(eq(allowedUser.email, email));

      console.log(`✅ Successfully deleted user ${email} and all related data`);
    } catch (error) {
      console.error(`❌ Error deleting user ${email}:`, error);
      throw error;
    }
  });
}

export async function getUserByEmail(email: string) {
  return retryOperation(async () => {
    const [userRecord] = await db
      .select()
      .from(user)
      .where(eq(user.email, email));

    return userRecord || null;
  });
}

export async function createUserInDB(
  email: string,
  password: string,
  role: 'user' | 'admin' = 'user',
) {
  return retryOperation(async () => {
    try {
      const hashedPassword = generateHashedPassword(password);

      const [newUser] = await db
        .insert(user)
        .values({ email, password: hashedPassword, role })
        .returning();

      return newUser;
    } catch (error) {
      if (error instanceof Error && error.message.includes('duplicate key')) {
        // User already exists
        return null;
      }
      throw error;
    }
  });
}
