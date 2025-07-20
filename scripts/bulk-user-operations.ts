#!/usr/bin/env node

/**
 * Script to perform bulk operations on users and roles
 * 
 * Usage:
 *   npx tsx scripts/bulk-user-operations.ts clean-guests        - Remove all guest users
 *   npx tsx scripts/bulk-user-operations.ts promote-admins      - Promote specific users to admin
 *   npx tsx scripts/bulk-user-operations.ts list-stats         - Show user statistics
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, like, count } from 'drizzle-orm';
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

async function cleanGuestUsers() {
  try {
    console.log('🧹 Cleaning up guest users...');
    
    // First, count guest users
    const [guestCount] = await db
      .select({ count: count() })
      .from(user)
      .where(like(user.email, 'guest-%'));
    
    console.log(`ℹ️  Found ${guestCount.count} guest users`);
    
    if (guestCount.count === 0) {
      console.log('✅ No guest users to clean up');
      return;
    }

    // Delete guest users
    const deleted = await db
      .delete(user)
      .where(like(user.email, 'guest-%'))
      .returning({ email: user.email });
    
    console.log(`✅ Cleaned up ${deleted.length} guest users`);
  } catch (error) {
    console.error(`❌ Error cleaning guest users:`, error);
  }
}

async function promoteAdmins() {
  try {
    // Define users who should be admins
    const adminEmails = [
      'thorsten@schminkel.de',
      // Add more admin emails here as needed
    ];

    console.log('👑 Promoting users to admin role...');
    
    for (const email of adminEmails) {
      const [existingUser] = await db.select().from(user).where(eq(user.email, email));
      
      if (existingUser) {
        if (existingUser.role !== 'admin') {
          await db.update(user).set({ role: 'admin' }).where(eq(user.email, email));
          console.log(`✅ Promoted ${email} to admin`);
        } else {
          console.log(`ℹ️  ${email} is already an admin`);
        }
      } else {
        console.log(`⚠️  User ${email} not found in database`);
      }
    }
  } catch (error) {
    console.error(`❌ Error promoting admins:`, error);
  }
}

async function showStats() {
  try {
    console.log('📊 User Statistics:');
    
    // Total users
    const [totalUsers] = await db.select({ count: count() }).from(user);
    console.log(`   Total users: ${totalUsers.count}`);
    
    // Admin users
    const [adminUsers] = await db
      .select({ count: count() })
      .from(user)
      .where(eq(user.role, 'admin'));
    console.log(`   Admin users: ${adminUsers.count}`);
    
    // Regular users
    const [regularUsers] = await db
      .select({ count: count() })
      .from(user)
      .where(eq(user.role, 'user'));
    console.log(`   Regular users: ${regularUsers.count}`);
    
    // Guest users
    const [guestUsers] = await db
      .select({ count: count() })
      .from(user)
      .where(like(user.email, 'guest-%'));
    console.log(`   Guest users: ${guestUsers.count}`);
    
    // Recent users (last 7 days) - would need createdAt column for this
    console.log('\n👥 Admin Users:');
    const admins = await db
      .select({ email: user.email })
      .from(user)
      .where(eq(user.role, 'admin'));
    
    if (admins.length > 0) {
      admins.forEach(admin => {
        console.log(`   - ${admin.email}`);
      });
    } else {
      console.log('   No admin users found');
    }
  } catch (error) {
    console.error(`❌ Error getting stats:`, error);
  }
}

async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'clean-guests':
      await cleanGuestUsers();
      break;
      
    case 'promote-admins':
      await promoteAdmins();
      break;
      
    case 'list-stats':
      await showStats();
      break;
      
    default:
      console.log(`Usage:
  npx tsx scripts/bulk-user-operations.ts clean-guests     - Remove all guest users
  npx tsx scripts/bulk-user-operations.ts promote-admins   - Promote specific users to admin
  npx tsx scripts/bulk-user-operations.ts list-stats      - Show user statistics`);
      break;
  }
  
  await client.end();
}

main().catch(console.error);
