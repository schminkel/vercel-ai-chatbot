#!/usr/bin/env node

/**
 * Script to manage allowed users for the chatbot system
 * 
 * Usage:
 *   npx tsx scripts/manage-allowed-users.ts add user@example.com
 *   npx tsx scripts/manage-allowed-users.ts list
 *   npx tsx scripts/manage-allowed-users.ts check user@example.com
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import { allowedUser } from '../lib/db/schema';

// Load environment variables
config({
  path: '.env.local',
});

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is required');
}

const client = postgres(process.env.POSTGRES_URL);
const db = drizzle(client);

async function addAllowedUser(email: string) {
  try {
    await db.insert(allowedUser).values({ email });
    console.log(`✅ Successfully added ${email} to allowed users`);
  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate key')) {
      console.log(`ℹ️  ${email} is already in the allowed users list`);
    } else {
      console.error(`❌ Error adding allowed user:`, error);
    }
  }
}

async function listAllowedUsers() {
  try {
    const users = await db.select().from(allowedUser);
    console.log(`📋 Allowed users (${users.length}):`);
    users.forEach((user) => {
      console.log(`   - ${user.email}`);
    });
  } catch (error) {
    console.error(`❌ Error listing allowed users:`, error);
  }
}

async function checkAllowedUser(email: string) {
  try {
    const [user] = await db.select().from(allowedUser).where(eq(allowedUser.email, email));
    if (user) {
      console.log(`✅ ${email} is allowed`);
    } else {
      console.log(`❌ ${email} is NOT allowed`);
    }
  } catch (error) {
    console.error(`❌ Error checking allowed user:`, error);
  }
}

async function main() {
  const command = process.argv[2];
  const email = process.argv[3];

  switch (command) {
    case 'add':
      if (!email) {
        console.error('❌ Please provide an email address');
        process.exit(1);
      }
      await addAllowedUser(email);
      break;
      
    case 'list':
      await listAllowedUsers();
      break;
      
    case 'check':
      if (!email) {
        console.error('❌ Please provide an email address');
        process.exit(1);
      }
      await checkAllowedUser(email);
      break;
      
    default:
      console.log(`Usage:
  npx tsx scripts/manage-allowed-users.ts add <email>    - Add a user to allowed list
  npx tsx scripts/manage-allowed-users.ts list          - List all allowed users
  npx tsx scripts/manage-allowed-users.ts check <email> - Check if user is allowed`);
      break;
  }
  
  await client.end();
}

main().catch(console.error);
