#!/usr/bin/env node

/**
 * Script to manage user roles for the chatbot system
 * 
 * Usage:
 *   npx tsx scripts/manage-user-roles.ts set user@example.com admin
 *   npx tsx scripts/manage-user-roles.ts set user@example.com user
 *   npx tsx scripts/manage-user-roles.ts get user@example.com
 *   npx tsx scripts/manage-user-roles.ts list
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import { user } from '../lib/db/schema';

// Load environment variables
config({
  path: '.env.local',
});

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is required');
}

const client = postgres(process.env.POSTGRES_URL);
const db = drizzle(client);

async function setUserRole(email: string, role: 'user' | 'admin') {
  try {
    // Check if user exists
    const [existingUser] = await db.select().from(user).where(eq(user.email, email));
    
    if (!existingUser) {
      console.log(`❌ User with email ${email} not found`);
      return;
    }

    await db.update(user).set({ role }).where(eq(user.email, email));
    console.log(`✅ Successfully set role '${role}' for ${email}`);
  } catch (error) {
    console.error(`❌ Error setting user role:`, error);
  }
}

async function getUserRole(email: string) {
  try {
    const [selectedUser] = await db
      .select({ email: user.email, role: user.role })
      .from(user)
      .where(eq(user.email, email));
    
    if (selectedUser) {
      console.log(`📋 User: ${selectedUser.email} | Role: ${selectedUser.role}`);
    } else {
      console.log(`❌ User with email ${email} not found`);
    }
  } catch (error) {
    console.error(`❌ Error getting user role:`, error);
  }
}

async function listAllUsers() {
  try {
    const users = await db
      .select({ email: user.email, role: user.role })
      .from(user);
    
    console.log(`📋 All users (${users.length}):`);
    
    const adminUsers = users.filter(u => u.role === 'admin');
    const regularUsers = users.filter(u => u.role === 'user');
    
    if (adminUsers.length > 0) {
      console.log(`\n👑 Admins (${adminUsers.length}):`);
      adminUsers.forEach((u) => {
        console.log(`   - ${u.email}`);
      });
    }
    
    if (regularUsers.length > 0) {
      console.log(`\n👤 Users (${regularUsers.length}):`);
      regularUsers.forEach((u) => {
        console.log(`   - ${u.email}`);
      });
    }
  } catch (error) {
    console.error(`❌ Error listing users:`, error);
  }
}

async function main() {
  const command = process.argv[2];
  const email = process.argv[3];
  const role = process.argv[4] as 'user' | 'admin';

  switch (command) {
    case 'set':
      if (!email || !role) {
        console.error('❌ Please provide both email and role (user or admin)');
        process.exit(1);
      }
      if (role !== 'user' && role !== 'admin') {
        console.error('❌ Role must be either "user" or "admin"');
        process.exit(1);
      }
      await setUserRole(email, role);
      break;
      
    case 'get':
      if (!email) {
        console.error('❌ Please provide an email address');
        process.exit(1);
      }
      await getUserRole(email);
      break;
      
    case 'list':
      await listAllUsers();
      break;
      
    default:
      console.log(`Usage:
  npx tsx scripts/manage-user-roles.ts set <email> <role>  - Set user role (user|admin)
  npx tsx scripts/manage-user-roles.ts get <email>        - Get user role
  npx tsx scripts/manage-user-roles.ts list               - List all users with their roles`);
      break;
  }
  
  await client.end();
}

main().catch(console.error);
