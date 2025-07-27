#!/usr/bin/env tsx
/**
 * Demo script showing the difference between soft delete and hard delete
 *
 * Usage:
 * npm run build && npx tsx scripts/demo-soft-delete.ts
 */

async function demoSoftDelete() {
  console.log('🚀 Soft Delete Demo');
  console.log('==================');

  // Example chat ID (in a real scenario, you'd get this from the database)
  const exampleChatId = 'example-chat-id-12345';

  console.log('\n1. Original delete behavior (now soft delete):');
  console.log(`deleteChatById('${exampleChatId}') - Sets hidden=true`);

  console.log('\n2. New hard delete behavior:');
  console.log(
    `hardDeleteChatById('${exampleChatId}') - Permanently removes all data`,
  );

  console.log('\n3. Utility functions:');
  console.log(`hideChat('${exampleChatId}') - Hide a chat`);
  console.log(`unhideChat('${exampleChatId}') - Unhide a chat`);
  console.log(
    `softDeleteChat('${exampleChatId}') - Soft delete (same as deleteChatById)`,
  );
  console.log(
    `permanentlyDeleteChat('${exampleChatId}') - Hard delete (same as hardDeleteChatById)`,
  );

  console.log('\n4. Effects of soft delete:');
  console.log('- Chat disappears from sidebar');
  console.log('- Direct URL access returns 404');
  console.log('- API calls return 404');
  console.log('- Data is preserved in database');
  console.log('- Can be reversed by setting hidden=false');

  console.log('\n5. Effects of hard delete:');
  console.log('- Chat, messages, votes, streams deleted');
  console.log('- S3 files deleted');
  console.log('- Permanent and irreversible');
  console.log('- Use only for compliance or cleanup');

  console.log(
    '\n✅ Demo complete! The system now uses soft delete by default.',
  );
}

// Run the demo if this script is executed directly
if (require.main === module) {
  demoSoftDelete().catch(console.error);
}

export { demoSoftDelete };
