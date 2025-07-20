import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { allowedUser } from '../lib/db/schema';

// Load environment variables
config({
  path: '.env.local',
});

async function addInitialAllowedUser() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL environment variable is required');
  }
  
  const client = postgres(process.env.POSTGRES_URL);
  const db = drizzle(client);

  try {
    await db.insert(allowedUser).values({ 
      email: 'thorsten@schminkel.de' 
    });
    console.log('Successfully added thorsten@schminkel.de to allowed users');
  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate key')) {
      console.log('thorsten@schminkel.de is already in the allowed users list');
    } else {
      console.error('Error adding allowed user:', error);
    }
  } finally {
    await client.end();
  }
}

addInitialAllowedUser();
