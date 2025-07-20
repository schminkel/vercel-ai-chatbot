#!/usr/bin/env node

/**
 * Script to set up initial admin user and manage user roles
 * 
 * Usage:
 *   npx tsx scripts/setup-admin.ts thorsten@schminkel.de
 *   npx tsx scripts/setup-admin.ts <email>
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import { user, allowedUser } from '../lib/db/schema';

// Load environment variables
config({
  path: '.env.local',
});

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is required');
}

const client = postgres(process.env.POSTGRES_URL);
const db = drizzle(client);

async function setupAdmin(email: string) {
  try {
    // First, ensure the user is in the allowed users list
    const [allowedUserRecord] = await db
      .select()
      .from(allowedUser)
      .where(eq(allowedUser.email, email));
    
    if (!allowedUserRecord) {
      await db.insert(allowedUser).values({ email });
      console.log(`✅ Added ${email} to allowed users list`);
    } else {
      console.log(`ℹ️  ${email} is already in the allowed users list`);
    }

    // Check if user exists in the User table
    const [existingUser] = await db.select().from(user).where(eq(user.email, email));
    
    if (existingUser) {
      // Update existing user to admin role
      await db.update(user).set({ role: 'admin' }).where(eq(user.email, email));
      console.log(`✅ Successfully set admin role for existing user: ${email}`);
    } else {
      console.log(`ℹ️  User ${email} not found in User table yet. They will get admin role when they first sign up.`);
      console.log(`ℹ️  The user can now sign up and will automatically get the 'user' role, but you can use the manage-user-roles.ts script to change it to 'admin' after they register.`);
    }
  } catch (error) {
    console.error(`❌ Error setting up admin:`, error);
  }
}

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error('❌ Please provide an email address');
    console.log('Usage: npx tsx scripts/setup-admin.ts <email>');
    process.exit(1);
  }

  // Basic email validation
  if (!email.includes('@') || !email.includes('.')) {
    console.error('❌ Please provide a valid email address');
    process.exit(1);
  }

  console.log(`🔧 Setting up admin access for: ${email}`);
  await setupAdmin(email);
  
  console.log(`\n📋 Summary:`);
  console.log(`   - ${email} is now in the allowed users list`);
  console.log(`   - If the user exists, they now have admin role`);
  console.log(`   - If the user doesn't exist yet, use 'npx tsx scripts/manage-user-roles.ts set ${email} admin' after they register`);
  
  await client.end();
}

main().catch(console.error);
