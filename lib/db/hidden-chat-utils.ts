import {
  updateChatHiddenById,
  deleteChatById,
  hardDeleteChatById,
} from './queries';

/**
 * Hide a chat by setting its hidden status to true
 */
export async function hideChat(chatId: string) {
  return updateChatHiddenById({ chatId, hidden: true });
}

/**
 * Unhide a chat by setting its hidden status to false
 */
export async function unhideChat(chatId: string) {
  return updateChatHiddenById({ chatId, hidden: false });
}

/**
 * Toggle the hidden status of a chat
 */
export async function toggleChatHidden(chatId: string, hidden: boolean) {
  return updateChatHiddenById({ chatId, hidden });
}

/**
 * Soft delete a chat by setting its hidden status to true
 * This is the default delete behavior - the chat becomes inaccessible but data is preserved
 */
export async function softDeleteChat(chatId: string) {
  return deleteChatById({ id: chatId });
}

/**
 * Permanently delete a chat and all associated data
 * This will delete the chat, messages, votes, streams, and S3 files
 * Use with caution - this action cannot be undone
 */
export async function permanentlyDeleteChat(chatId: string) {
  return hardDeleteChatById({ id: chatId });
}
