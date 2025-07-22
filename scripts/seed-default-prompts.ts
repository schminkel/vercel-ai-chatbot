#!/usr/bin/env npx tsx

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { user, prompt } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';

config({
  path: '.env.local',
});

// Create database connection directly
// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

interface DefaultPrompt {
  title: string;
  prompt: string;
  modelId?: string | null;
}

const defaultPrompts: DefaultPrompt[] = [
  {
    title: 'E-Mail-Optimizer',
    prompt: 'Optimiere den Text hinsichtlich Rechtschreibung und Grammatik. Führe nur leichte Anpassungen durch um die Verständlichkeit zu verbessern. Liste die Anpassungen kurz auf und gebe das Ergebnis in einen Code block zum leichten kopieren.',
    modelId: 'openai-gpt-4.1-mini',
  },
  {
    title: 'Write code to',
    prompt: `Write code to demonstrate djikstra's algorithm`,
    modelId: 'openai-gpt-4.1',
  },
  {
    title: 'Help me write an essay',
    prompt: `Help me write an essay about silicon valley`,
    modelId: 'anthropic-claude-sonnet-4',
  },
  {
    title: 'What is the weather',
    prompt: 'What is the weather in San Francisco?',
    modelId: 'xai-grok-3-mini',
  },
  {
    title: 'Code Review Assistant',
    prompt: 'Please review the following code for best practices, potential bugs, performance improvements, and security issues. Provide specific suggestions with explanations.',
    modelId: 'openai-gpt-4.1',
  },
  {
    title: 'Technical Documentation',
    prompt: 'Help me create comprehensive technical documentation for the following code or system. Include usage examples, API references, and setup instructions.',
    modelId: 'anthropic-claude-sonnet-4',
  },
  {
    title: 'SQL Query Helper',
    prompt: 'Help me write efficient SQL queries. Explain the query structure and suggest optimizations if needed.',
    modelId: 'openai-gpt-4.1-mini',
  },
  {
    title: 'Debug Assistant',
    prompt: 'Help me debug this code issue. Analyze the error, identify the root cause, and provide a solution with explanation.',
    modelId: 'openai-gpt-4.1',
  },
];

// Direct database functions
async function getAllUsers() {
  return await db
    .select({ id: user.id, email: user.email, role: user.role })
    .from(user);
}

async function getDefaultPrompts() {
  return await db
    .select()
    .from(prompt)
    .where(eq(prompt.isDefault, true))
    .orderBy(asc(prompt.createdAt));
}

async function bulkCreatePrompts(prompts: Array<Omit<typeof prompt.$inferSelect, 'id' | 'createdAt' | 'updatedAt'>>) {
  const now = new Date();
  const promptsWithTimestamps = prompts.map(p => ({
    ...p,
    createdAt: now,
    updatedAt: now,
  }));
  
  return await db.insert(prompt).values(promptsWithTimestamps).returning();
}

async function seedDefaultPrompts() {
  try {
    console.log('🌱 Starting to seed default prompts...');
    
    // Check if default prompts already exist
    const existingDefaults = await getDefaultPrompts();
    if (existingDefaults.length > 0) {
      console.log(`⚠️  Found ${existingDefaults.length} existing default prompts. Skipping seed.`);
      console.log('To re-seed, first delete existing default prompts from the database.');
      return;
    }

    // Get all users to seed prompts for each user
    const users = await getAllUsers();
    
    if (users.length === 0) {
      console.log('⚠️  No users found. Creating system default prompts only.');
      
      // Create a system user for default prompts (this is a fallback)
      // In practice, you might want to create these when a user signs up
      const systemPrompts = defaultPrompts.map(p => ({
        title: p.title,
        prompt: p.prompt,
        modelId: p.modelId || null,
        userId: '00000000-0000-0000-0000-000000000000', // System UUID
        isDefault: true,
      }));
      
      await bulkCreatePrompts(systemPrompts);
      console.log(`✅ Created ${systemPrompts.length} system default prompts`);
      return;
    }

    console.log(`👥 Found ${users.length} users. Creating default prompts for each user...`);
    
    // Create prompts for each user
    const allPrompts = [];
    
    for (const user of users) {
      const userPrompts = defaultPrompts.map(p => ({
        title: p.title,
        prompt: p.prompt,
        modelId: p.modelId || null,
        userId: user.id,
        isDefault: false, // User-specific copies are not marked as default
      }));
      allPrompts.push(...userPrompts);
    }
    
    // Also create true default prompts for new users
    const systemDefaults = defaultPrompts.map(p => ({
      title: p.title,
      prompt: p.prompt,
      modelId: p.modelId || null,
      userId: users[0].id, // Use first user as owner of defaults
      isDefault: true,
    }));
    allPrompts.push(...systemDefaults);
    
    await bulkCreatePrompts(allPrompts);
    
    console.log(`✅ Successfully seeded ${allPrompts.length} prompts:`);
    console.log(`   - ${defaultPrompts.length * users.length} user-specific prompts`);
    console.log(`   - ${defaultPrompts.length} default prompts for new users`);
    
  } catch (error) {
    console.error('❌ Failed to seed default prompts:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Function to create prompts for a specific user (useful for new user onboarding)
export async function createPromptsForNewUser(userId: string) {
  try {
    const defaults = await getDefaultPrompts();
    
    if (defaults.length === 0) {
      // If no defaults exist, use hardcoded ones
      const userPrompts = defaultPrompts.map(p => ({
        title: p.title,
        prompt: p.prompt,
        modelId: p.modelId || null,
        userId,
        isDefault: false,
      }));
      
      return await bulkCreatePrompts(userPrompts);
    }
    
    // Copy default prompts to the new user
    const userPrompts = defaults.map(p => ({
      title: p.title,
      prompt: p.prompt,
      modelId: p.modelId,
      userId,
      isDefault: false,
    }));
    
    return await bulkCreatePrompts(userPrompts);
  } catch (error) {
    console.error('Failed to create prompts for new user:', error);
    throw error;
  }
}

// Run the seeding if this script is executed directly
if (require.main === module) {
  seedDefaultPrompts()
    .then(() => {
      console.log('🎉 Seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}
