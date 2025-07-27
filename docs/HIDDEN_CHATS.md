# Hidden Chats Feature

## Overview

The Hidden Chats feature allows chats to be marked as "hidden" and completely removed from the UI. When a chat's `hidden` field is set to `true`, it becomes inaccessible through all user-facing interfaces.

**Important**: The delete functionality now performs a "soft delete" by setting the `hidden` flag to `true` instead of permanently removing the chat data.

## Database Schema

A new `hidden` boolean field has been added to the `Chat` table:

```sql
ALTER TABLE "Chat" ADD COLUMN "hidden" boolean DEFAULT false NOT NULL;
```

- **Default Value**: `false` (all existing and new chats are visible by default)
- **Type**: `boolean NOT NULL`

## Behavior

### Hidden Chats Are NOT Visible In:

1. **Sidebar History** - Hidden chats do not appear in the chat history sidebar
2. **Chat Pages** - Direct URL access to hidden chats returns 404
3. **API Endpoints** - Hidden chats return 404 from all public API endpoints:
   - `/api/vote` (both GET and PATCH)
   - `/api/chat/[id]/stream`
   - Sending new messages to hidden chats creates a new chat instead

### Hidden Chats ARE Still Accessible For:

1. **Administrative Operations** (by chat owner):
   - DELETE operations (soft delete - sets `hidden = true`)
   - PATCH operations (owners can still rename hidden chats)
   - Internal system operations

## Delete Behavior

### Soft Delete (Default)
- **Function**: `deleteChatById()` 
- **Behavior**: Sets `hidden = true`
- **Preserves**: All chat data, messages, votes, streams, and S3 files
- **UI Impact**: Chat disappears from UI immediately
- **Reversible**: Yes, by setting `hidden = false`

### Hard Delete (Administrative)
- **Function**: `hardDeleteChatById()`
- **Behavior**: Permanently removes all data
- **Deletes**: Chat, messages, votes, streams, and S3 files
- **UI Impact**: Chat disappears from UI permanently
- **Reversible**: No - all data is lost forever

## Implementation Details

### Database Layer

- `getChatsByUserId()` - Modified to exclude chats where `hidden = true`
- `saveChat()` - Updated to accept optional `hidden` parameter (defaults to `false`)
- `updateChatHiddenById()` - Function to update chat hidden status
- `deleteChatById()` - **Changed**: Now performs soft delete (sets `hidden = true`)
- `hardDeleteChatById()` - New function for permanent deletion

### API Layer

- **Chat API** (`/api/chat`) - DELETE endpoint now performs soft delete
- **Vote API** (`/api/vote`) - Returns 404 for hidden chats
- **Stream API** (`/api/chat/[id]/stream`) - Returns 404 for hidden chats
- **Chat Page** (`/chat/[id]`) - Returns 404 for hidden chats

### Utility Functions

```typescript
// Hide a chat
await hideChat(chatId);

// Unhide a chat
await unhideChat(chatId);

// Toggle hidden status
await toggleChatHidden(chatId, true/false);

// Soft delete (default delete behavior)
await softDeleteChat(chatId);

// Permanent delete (use with caution)
await permanentlyDeleteChat(chatId);
```

## Migration

Run the migration to add the `hidden` field:

```bash
npm run db:migrate
```

## Security Considerations

- Hidden chats are completely inaccessible through the UI and public APIs
- Only the chat owner can perform administrative operations on hidden chats
- Hidden chats cannot be accessed even if someone knows the chat ID
- The feature respects existing privacy controls (private vs public chats)
- Soft delete preserves data for potential recovery or auditing

## Use Cases

### Soft Delete (Default)
- **User-initiated deletion**: When users click "delete" in the UI
- **Content moderation**: Hide inappropriate chats while preserving evidence
- **Temporary removal**: Hide chats for review or investigation
- **Data preservation**: Maintain chat history for compliance/legal requirements

### Hard Delete (Administrative)
- **GDPR compliance**: Permanent data removal upon user request
- **Storage optimization**: Remove old chats to free up space
- **Security incidents**: Permanently remove compromised data
- **Administrative cleanup**: Remove test or spam data

## Testing

Test templates are provided in `/tests/e2e/hidden-chats.test.ts` for:
- Sidebar visibility
- Direct URL access
- API endpoint access
- Soft delete behavior

## Migration from Hard Delete

Existing code will continue to work without changes:
- `deleteChatById()` calls now perform soft delete
- UI behavior remains the same (chats disappear)
- No breaking changes to API contracts
- Hard delete functionality is still available via `hardDeleteChatById()`

## Future Enhancements

Potential future features could include:
- UI controls for users to hide/unhide their own chats
- Admin panel for managing hidden chats
- Bulk hide/unhide operations
- Restoration UI for accidentally deleted chats
- Permanent delete scheduling (auto-delete after X days)
- Archive functionality built on top of hidden chats
