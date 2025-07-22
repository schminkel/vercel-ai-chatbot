# Drag-and-Drop Implementation for Suggested Actions

## Overview

This implementation adds drag-and-drop functionality to the suggested action prompt cards, allowing users to reorder them within the grid. The updated card order is persisted in the database using a new `order` field.

## Features Implemented

### 1. Database Schema Changes

- **New Field**: Added `order` field of type `text` to the `Prompt` table with default value '0'
- **Migration**: Created migration `0010_omniscient_silverclaw.sql` to add the order field
- **Ordering**: Updated queries to order prompts by `order` field first, then by `createdAt`

### 2. Drag-and-Drop UI Components

#### Core Components:
- **Reorder.Group**: Uses Framer Motion's Reorder component for drag-and-drop
- **Reorder.Item**: Individual draggable prompt cards
- **GripVerticalIcon**: New icon component for drag handles
- **DropIndicator**: Visual indicator for drop zones (created but ready for enhancement)

#### Visual Feedback:
- **Drag Handle**: Visible grip icon in the top-left corner of each card
- **Progress Indicator**: Shows "Drag to reorder cards" during drag and "Saving new order..." during API calls
- **Card Scaling**: Cards scale up (1.05x) during drag with drop shadow
- **Cursor Changes**: Changes from 'grab' to 'grabbing' during drag

### 3. Database Functions

#### New Functions in `lib/db/queries.ts`:
```typescript
// Helper functions for lexicographic ordering
function generateNextOrder(order: string): string
function generateOrderBetween(orderA: string, orderB: string): string

// Database operations
export async function reorderPrompts({
  userId,
  promptId, 
  newOrder,
}: {
  userId: string;
  promptId: string;
  newOrder: string;
})
```

#### Updated Functions:
- `createPrompt()`: Now includes order calculation for new prompts
- `getPromptsByUserId()`: Orders by `order` field then `createdAt`
- `getDefaultPrompts()`: Orders by `order` field then `createdAt`
- `updatePrompt()`: Now supports updating the order field

### 4. Server Actions

#### New Action in `app/(chat)/actions.ts`:
```typescript
export async function reorderUserPrompts({
  userId,
  promptId,
  newOrder,
}: {
  userId: string;
  promptId: string;
  newOrder: string;
})
```

### 5. Component Logic

#### Key State Variables:
- `isDragging`: Tracks if any card is currently being dragged
- `isReordering`: Tracks if a reorder API call is in progress
- `draggedItemId`: ID of the currently dragged item
- `hoveredDropZone`: Index of the currently hovered drop zone

#### Reordering Algorithm:
1. **Calculate New Order**: When a card is moved, calculate the new order value based on position
2. **Optimistic Updates**: Immediately update UI while API call is in progress
3. **Error Handling**: Revert to original order if API call fails
4. **Refresh**: Reload prompts from server after successful reorder to ensure consistency

## Technical Details

### Order Field Implementation
- Uses string-based lexicographic ordering for flexibility
- Initial orders are multiples of 1000 (0, 1000, 2000, etc.) to allow insertion
- When inserting between items, calculates midpoint
- When space is too small, multiplies by 1000 to create room

### Performance Considerations
- **Optimistic Updates**: UI responds immediately during drag
- **Debounced API Calls**: Only makes one API call per complete drag operation
- **Minimal Re-renders**: Uses React.memo and careful state management
- **Layout Animations**: Framer Motion handles smooth transitions

### Accessibility
- **Keyboard Support**: Cards remain focusable and clickable
- **Screen Readers**: Proper ARIA labels and semantic structure
- **Touch Support**: Works on mobile devices with touch events

## Usage

### For Users:
1. **Drag**: Click and hold the grip icon (⋮⋮) in the top-left corner of any card
2. **Drop**: Drag the card to the desired position and release
3. **Feedback**: Visual indicators show drag state and save progress
4. **Persistence**: Order is automatically saved and maintained across sessions

### For Developers:
1. **Extension**: The system is designed to be extended for other reorderable lists
2. **Customization**: Visual feedback can be customized via CSS classes
3. **Integration**: Server actions can be used from other components

## Files Modified

### Database
- `lib/db/schema.ts` - Added order field to Prompt table
- `lib/db/queries.ts` - Added reordering functions and updated existing queries
- `lib/db/migrations/0010_omniscient_silverclaw.sql` - Migration file

### Components  
- `components/suggested-actions.tsx` - Main implementation
- `components/icons.tsx` - Added GripVerticalIcon
- `components/drop-indicator.tsx` - New component for drop zones

### Server Actions
- `app/(chat)/actions.ts` - Added reorderUserPrompts action

### Scripts
- `scripts/seed-default-prompts.ts` - Updated to include order field

## Future Enhancements

### Potential Improvements:
1. **Drop Zones**: Visual indicators between cards showing exact drop location
2. **Batch Reordering**: Support for selecting and moving multiple cards
3. **Undo/Redo**: History system for reordering operations
4. **Keyboard Navigation**: Arrow keys for reordering without mouse
5. **Grid Layout**: Smart reordering that considers grid layout vs list layout

### Performance Optimizations:
1. **Virtual Scrolling**: For large numbers of prompts
2. **Lazy Loading**: Load prompts on demand
3. **Caching**: Client-side caching of prompt order

## Testing

### Automated Tests:
- TypeScript compilation passes
- Database schema validation
- Component import verification
- Server action functionality

### Manual Testing:
1. Start development server: `npm run dev`
2. Navigate to chat interface
3. Test drag-and-drop functionality in suggested actions section
4. Verify order persistence across page refreshes
5. Test error handling with network issues

## Conclusion

The drag-and-drop implementation provides a seamless user experience for reordering suggested action prompts while maintaining data consistency and providing appropriate visual feedback. The system is designed to be performant, accessible, and extensible for future enhancements.
