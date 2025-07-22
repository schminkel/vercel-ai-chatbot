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

async function resetOrderValues() {
  console.log('Resetting all prompt order values to clean sequential values...');
  
  try {
    // Get all prompts grouped by user, ordered by current order then creation date
    const allPrompts = await db
      .select()
      .from(prompt)
      .orderBy(asc(prompt.userId), asc(prompt.order), asc(prompt.createdAt));
    
    // Group by user
    const promptsByUser: Record<string, typeof allPrompts> = {};
    allPrompts.forEach(p => {
      if (!promptsByUser[p.userId]) {
        promptsByUser[p.userId] = [];
      }
      promptsByUser[p.userId].push(p);
    });
    
    let totalUpdated = 0;
    
    // Update each user's prompts with clean sequential order
    for (const [userId, userPrompts] of Object.entries(promptsByUser)) {
      console.log(`Updating ${userPrompts.length} prompts for user ${userId.substring(0, 8)}...`);
      
      for (let i = 0; i < userPrompts.length; i++) {
        // Generate clean sequential order: a0, b0, c0, d0, etc.
        const letterIndex = i % 26;
        const numberSuffix = Math.floor(i / 26);
        const newOrder = String.fromCharCode(97 + letterIndex) + numberSuffix;
        
        await db
          .update(prompt)
          .set({ 
            order: newOrder,
            updatedAt: new Date()
          })
          .where(eq(prompt.id, userPrompts[i].id));
        
        console.log(`  ${userPrompts[i].title.substring(0, 30)}... -> ${newOrder}`);
        totalUpdated++;
      }
    }
    
    console.log(`\nSuccessfully reset ${totalUpdated} prompts with clean sequential order values`);
    
  } catch (error) {
    console.error('Error resetting order values:', error);
  } finally {
    await client.end();
  }
}

resetOrderValues();
