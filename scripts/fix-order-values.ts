#!/usr/bin/env tsx

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { prompt } from '../lib/db/schema';
import { asc, eq } from 'drizzle-orm';

// Load environment variables from .env.local
config({ path: '.env.local' });

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error('POSTGRES_URL environment variable is required');
}

const client = postgres(connectionString);
const db = drizzle(client);

async function fixOrderValues() {
  console.log('Fixing prompt order values...');
  
  try {
    // Get all prompts grouped by user
    const allPrompts = await db
      .select()
      .from(prompt)
      .orderBy(asc(prompt.userId), asc(prompt.createdAt));
    
    // Group by user
    const promptsByUser: Record<string, typeof allPrompts> = {};
    allPrompts.forEach(p => {
      if (!promptsByUser[p.userId]) {
        promptsByUser[p.userId] = [];
      }
      promptsByUser[p.userId].push(p);
    });
    
    let totalUpdated = 0;
    
    // Update each user's prompts with proper lexicographic order
    for (const [userId, userPrompts] of Object.entries(promptsByUser)) {
      console.log(`Updating ${userPrompts.length} prompts for user ${userId}`);
      
      for (let i = 0; i < userPrompts.length; i++) {
        const newOrder = String.fromCharCode(97 + (i % 26)) + Math.floor(i / 26);
        
        await db
          .update(prompt)
          .set({ 
            order: newOrder,
            updatedAt: new Date()
          })
          .where(eq(prompt.id, userPrompts[i].id));
        
        totalUpdated++;
      }
    }
    
    console.log(`Successfully updated ${totalUpdated} prompts with proper lexicographic order values`);
    
  } catch (error) {
    console.error('Error fixing order values:', error);
  } finally {
    await client.end();
  }
}

fixOrderValues();
