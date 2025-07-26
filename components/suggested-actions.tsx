'use client';

import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { memo, useState, useEffect, useRef } from 'react';
import type { VisibilityType } from './visibility-selector';
import type { Dispatch, SetStateAction } from 'react';
import {
  saveChatModelAsCookie,
  getUserPrompts,
  bulkReorderUserPrompts,
} from '@/app/(chat)/actions';
import { getDisplayModelName } from '@/lib/utils';
import type { Prompt } from '@/lib/db/schema';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontalIcon,
  PencilEditIcon,
  TrashIcon,
  PlusIcon,
  EyeIcon,
  EyeOffIcon,
} from '@/components/icons';
import { PromptDialog } from '@/components/prompt-dialog';
import { DeletePromptDialog } from '@/components/delete-prompt-dialog';
import { useSession } from 'next-auth/react';

interface SuggestedActionsProps {
  chatId: string;
  setInput: Dispatch<SetStateAction<string>>;
  selectedVisibilityType: VisibilityType;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  adjustHeight?: () => void;
  setModelId?: (modelId: string) => void;
  mobileLayout?: boolean;
  headerOnly?: boolean;
  gridOnly?: boolean;
  // Shared state props for mobile coordination
  sharedActionsVisible?: boolean | null;
  onToggleActions?: () => void;
}

function PureSuggestedActions({
  setInput,
  textareaRef,
  adjustHeight,
  setModelId,
  mobileLayout = false,
  headerOnly = false,
  gridOnly = false,
  sharedActionsVisible,
  onToggleActions,
}: SuggestedActionsProps) {
  const { data: session } = useSession();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [deletingPrompt, setDeletingPrompt] = useState<Prompt | null>(null);
  const [isAddingPrompt, setIsAddingPrompt] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [hoveredDropZone, setHoveredDropZone] = useState<number | null>(null);

  // Toggle state for showing/hiding actions - use shared state for mobile coordination
  const [localActionsVisible, setLocalActionsVisible] = useState<
    boolean | null
  >(null);
  const areActionsVisible =
    sharedActionsVisible !== undefined
      ? sharedActionsVisible
      : localActionsVisible;

  // Store original order when drag starts for comparison
  const originalOrderRef = useRef<Prompt[]>([]);

  // Set default visibility based on screen size on mount
  useEffect(() => {
    // Only set local state if not using shared state
    if (sharedActionsVisible === undefined) {
      const checkScreenSize = () => {
        // Default to visible on desktop (md and up), hidden on mobile
        setLocalActionsVisible(window.innerWidth >= 768);
      };

      checkScreenSize();
      window.addEventListener('resize', checkScreenSize);

      return () => {
        window.removeEventListener('resize', checkScreenSize);
      };
    }
  }, [sharedActionsVisible]);

  const loadPrompts = async () => {
    try {
      setIsLoading(true);
      const userPrompts = await getUserPrompts();

      // Sort prompts by order field to ensure consistent display
      const sortedPrompts = [...userPrompts].sort((a, b) =>
        a.order.localeCompare(b.order),
      );

      setPrompts(sortedPrompts);
    } catch (error) {
      console.error('Failed to load prompts:', error);
      // Set fallback prompts if needed
      setPrompts([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to calculate order between two items
  const calculateOrderBetween = (
    beforeOrder: string,
    afterOrder: string,
  ): string => {
    // For simplicity, when inserting between items, generate a fractional order
    // This keeps the ordering clean and predictable

    if (!beforeOrder && !afterOrder) {
      return 'a0';
    }

    if (!beforeOrder) {
      // Insert before first item
      const afterParts = afterOrder.match(/([a-z]+)(\d+)/);
      if (afterParts) {
        const [, letters, number] = afterParts;
        const num = Number.parseInt(number);
        if (letters === 'a' && num > 0) {
          return `a${num - 1}`;
        } else if (letters > 'a') {
          const prevLetter = String.fromCharCode(letters.charCodeAt(0) - 1);
          return `${prevLetter}${number}`;
        }
      }
      return `0${afterOrder}`; // Fallback
    }

    if (!afterOrder) {
      // Insert after last item
      const beforeParts = beforeOrder.match(/([a-z]+)(\d+)/);
      if (beforeParts) {
        const [, letters, number] = beforeParts;
        const nextLetter = String.fromCharCode(
          letters.charCodeAt(letters.length - 1) + 1,
        );
        return letters.slice(0, -1) + nextLetter + number;
      }
      return `${beforeOrder}a`; // Fallback
    }

    // Insert between two items
    const beforeParts = beforeOrder.match(/([a-z]+)(\d+)/);
    const afterParts = afterOrder.match(/([a-z]+)(\d+)/);

    if (beforeParts && afterParts) {
      const [, beforeLetters, beforeNum] = beforeParts;
      const [, afterLetters, afterNum] = afterParts;

      // If same letter prefix, try to insert between numbers
      if (beforeLetters === afterLetters) {
        const beforeNumber = Number.parseInt(beforeNum);
        const afterNumber = Number.parseInt(afterNum);
        if (afterNumber - beforeNumber > 1) {
          const midNumber = Math.floor((beforeNumber + afterNumber) / 2);
          return `${beforeLetters}${midNumber}`;
        }
      }

      // Otherwise, insert a fractional letter
      const beforeChar = beforeLetters.charAt(0);
      const afterChar = afterLetters.charAt(0);
      if (afterChar.charCodeAt(0) - beforeChar.charCodeAt(0) > 1) {
        const midChar = String.fromCharCode(
          Math.floor((beforeChar.charCodeAt(0) + afterChar.charCodeAt(0)) / 2),
        );
        return `${midChar}0`;
      }
    }

    // Fallback: add a suffix to the before order
    return `${beforeOrder}x`;
  };

  // Helper function to calculate new order for reordering
  const calculateNewOrder = (
    items: Prompt[],
    oldIndex: number,
    newIndex: number,
  ): string => {
    if (newIndex === 0) {
      // Moving to first position
      const firstOrder = items[0]?.order || 'a0';
      return calculateOrderBetween('', firstOrder);
    }

    if (newIndex >= items.length - 1) {
      // Moving to last position
      const lastOrder = items[items.length - 1]?.order || 'a0';
      return calculateOrderBetween(lastOrder, '');
    }

    // Moving between items - need to get the items at the target position
    const beforeItem = items[newIndex - 1];
    const afterItem = items[newIndex];

    return calculateOrderBetween(
      beforeItem?.order || '',
      afterItem?.order || '',
    );
  };

  const handleReorder = (reorderedPrompts: Prompt[]) => {
    // Only update the local state during drag, don't make API calls yet
    setPrompts(reorderedPrompts);
  };

  const handleDrop = async (dropIndex: number) => {
    if (!session?.user?.id || isReordering || !isDragging || !draggedItemId) {
      setHoveredDropZone(null);
      return;
    }

    const originalPrompts = originalOrderRef.current;
    const draggedPrompt = originalPrompts.find((p) => p.id === draggedItemId);

    if (!draggedPrompt) {
      setHoveredDropZone(null);
      return;
    }

    const originalIndex = originalPrompts.findIndex(
      (p) => p.id === draggedItemId,
    );

    // Adjust drop index if dragging forward (removing item shifts indices)
    const adjustedDropIndex =
      dropIndex > originalIndex ? dropIndex - 1 : dropIndex;

    if (originalIndex === adjustedDropIndex) {
      // No movement
      setHoveredDropZone(null);
      return;
    }

    try {
      setIsReordering(true);

      // Create new array with item moved to new position
      const newPrompts = [...originalPrompts];
      newPrompts.splice(originalIndex, 1); // Remove from original position
      newPrompts.splice(adjustedDropIndex, 0, draggedPrompt); // Insert at new position

      // Update UI immediately
      setPrompts(newPrompts);

      // Generate new sequential orders for all items
      const promptOrders = newPrompts.map((prompt, index) => ({
        id: prompt.id,
        order: `${index.toString().padStart(3, '0')}`, // "000", "001", "002", etc.
      }));

      await bulkReorderUserPrompts({
        userId: session.user.id,
        promptOrders,
      });

      // Update all items' orders in the current state
      setPrompts(
        newPrompts.map((prompt, index) => ({
          ...prompt,
          order: `${index.toString().padStart(3, '0')}`,
        })),
      );
    } catch (error) {
      console.error('Failed to reorder prompts:', error);
      // Revert on error
      setPrompts(originalPrompts);
    } finally {
      setIsReordering(false);
      setIsDragging(false);
      setDraggedItemId(null);
      setHoveredDropZone(null);
    }
  };

  const handleDragStart = (prompt: Prompt) => {
    setIsDragging(true);
    setDraggedItemId(prompt.id);
    // Store original order when drag starts
    originalOrderRef.current = [...prompts];
  };

  const handleDragEnd = async () => {
    // Clean up drag state - actual drop handling is done in handleDrop
    setIsDragging(false);
    setDraggedItemId(null);
    setHoveredDropZone(null);
  };

  useEffect(() => {
    loadPrompts();
  }, []);

  const handleEditPrompt = (prompt: Prompt) => {
    setEditingPrompt(prompt);
  };

  const handleDeletePrompt = (prompt: Prompt) => {
    setDeletingPrompt(prompt);
  };

  const handleAddPrompt = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAddingPrompt(true);
  };

  const handleToggleActions = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggleActions) {
      onToggleActions();
    } else {
      setLocalActionsVisible(!areActionsVisible);
    }
  };

  const handlePromptUpdated = () => {
    loadPrompts(); // Refresh the list
  };

  // Individual prompt card component
  const PromptCard = ({
    prompt,
    isDragging: isCardDragging,
  }: { prompt: Prompt; isDragging: boolean }) => (
    <div
      className={`block relative ${isCardDragging ? 'opacity-50' : 'opacity-100'}`}
    >
      <Button
        type="button"
        variant="ghost"
        onClick={(event) => {
          if (isDragging) return;
          event.preventDefault();
          event.stopPropagation();

          // Set the input with the suggested action title and prompt
          const newInput = `# ${prompt.title}\n${prompt.prompt}\n`;
          setInput(newInput);

          // Set the model if specified and setModelId is available
          if (prompt.modelId && setModelId) {
            setModelId(prompt.modelId);
            saveChatModelAsCookie(prompt.modelId);
          }

          // Focus the textarea and let React's useEffect handle height adjustment
          // Use requestAnimationFrame to ensure DOM is updated after state change
          requestAnimationFrame(() => {
            textareaRef?.current?.focus();
            // Don't call adjustHeight here - it will be called by the handleInput effect
          });
        }}
        onMouseDown={(e) => {
          // Prevent button from interfering with drag
          if (isDragging) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        className={`text-left border rounded-xl mx-auto sm:mx-0 px-4 py-3.5 text-sm flex-1 gap-1 sm:flex-col w-full max-w-full h-auto justify-start items-start relative overflow-hidden min-w-0 transition-all duration-200 ${
          isCardDragging
            ? 'shadow-2xl border-primary pointer-events-none'
            : 'hover:border-primary/50'
        }`}
      >
        <div className="flex flex-col gap-1 w-full min-w-0 overflow-hidden">
          <span className="font-medium truncate w-full">{prompt.title}</span>
          <div className="overflow-hidden h-5 relative">
            <span className="text-muted-foreground text-sm leading-tight absolute inset-0 overflow-hidden">
              {prompt.prompt}
            </span>
          </div>
          <span className="text-muted-foreground truncate">&nbsp;</span>
        </div>

        {/* Model indicator in bottom right corner */}
        {prompt.modelId && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-1 text-mono text-xs text-muted-foreground">
            <svg strokeLinejoin="round" viewBox="0 0 22 18">
              <path
                d="M2.5 0.5V0H3.5V0.5C3.5 1.60457 4.39543 2.5 5.5 2.5H6V3V3.5H5.5C4.39543 3.5 3.5 4.39543 3.5 5.5V6H3H2.5V5.5C2.5 4.39543 1.60457 3.5 0.5 3.5H0V3V2.5H0.5C1.60457 2.5 2.5 1.60457 2.5 0.5Z"
                fill="currentColor"
              />
              <path
                d="M14.5 4.5V5H13.5V4.5C13.5 3.94772 13.0523 3.5 12.5 3.5H12V3V2.5H12.5C13.0523 2.5 13.5 2.05228 13.5 1.5V1H14H14.5V1.5C14.5 2.05228 14.9477 2.5 15.5 2.5H16V3V3.5H15.5C14.9477 3.5 14.5 3.94772 14.5 4.5Z"
                fill="currentColor"
              />
              <path
                d="M8.40706 4.92939L8.5 4H9.5L9.59294 4.92939C9.82973 7.29734 11.7027 9.17027 14.0706 9.40706L15 9.5V10.5L14.0706 10.5929C11.7027 10.8297 9.82973 12.7027 9.59294 15.0706L9.5 16H8.5L8.40706 15.0706C8.17027 12.7027 6.29734 10.8297 3.92939 10.5929L3 10.5V9.5L3.92939 9.40706C6.29734 9.17027 8.17027 7.29734 8.40706 4.92939Z"
                fill="currentColor"
              />
            </svg>
            <span className="font-mono text-[11px]">
              {getDisplayModelName(prompt.modelId)}
            </span>
          </div>
        )}
      </Button>

      {/* Three dots menu in bottom left corner */}
      <div className="absolute bottom-2 left-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="size-6 p-0 text-muted-foreground hover:text-foreground pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <MoreHorizontalIcon size={14} />
              <span className="sr-only">More options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleEditPrompt(prompt);
              }}
            >
              <PencilEditIcon size={14} />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleDeletePrompt(prompt);
              }}
              className="text-destructive focus:text-destructive"
            >
              <TrashIcon size={14} />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  // Show loading state or empty state
  if (isLoading || areActionsVisible === null) {
    return (
      <div className="w-full mx-auto md:max-w-3xl lg:max-w-4xl xl:max-w-5xl">
        {/* Header with toggle and Add Prompt buttons */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-foreground">
            Suggested Actions
          </h3>
          <div className="flex items-center gap-2">
            <Button
              disabled
              size="sm"
              variant="outline"
              className="flex items-center gap-2 text-xs h-8 px-3"
            >
              <EyeIcon size={12} />
              Show Prompts
            </Button>
            <Button
              disabled
              size="sm"
              variant="outline"
              className="flex items-center gap-2 text-xs h-8 px-3"
            >
              <PlusIcon size={12} />
              Add Prompt
            </Button>
          </div>
        </div>

        {/* Loading skeleton */}
        <div
          data-testid="suggested-actions"
          className="grid sm:grid-cols-2 gap-2 w-full"
        >
          <div className="animate-pulse bg-muted rounded-xl h-24" />
          <div className="animate-pulse bg-muted rounded-xl h-24" />
          <div className="animate-pulse bg-muted rounded-xl h-24" />
          <div className="animate-pulse bg-muted rounded-xl h-24" />
        </div>
      </div>
    );
  }

  if (prompts.length === 0) {
    return (
      <div className="w-full mx-auto md:max-w-3xl lg:max-w-4xl xl:max-w-5xl">
        {/* Header with toggle and Add Prompt buttons */}
        <div className="flex items-center justify-between mb-2">
          <h3
            className={`text-sm font-medium text-foreground ${areActionsVisible ? 'visible' : 'invisible'}`}
          >
            Suggested Actions
          </h3>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleToggleActions}
              size="sm"
              variant="outline"
              type="button"
              className="flex items-center gap-2 text-xs h-8 px-3"
            >
              {areActionsVisible ? (
                <>
                  <EyeOffIcon size={12} />
                  Hide Prompts
                </>
              ) : (
                <>
                  <EyeIcon size={12} />
                  Show Prompts
                </>
              )}
            </Button>
            <Button
              onClick={handleAddPrompt}
              size="sm"
              variant="outline"
              type="button"
              className="flex items-center gap-2 text-xs h-8 px-3"
            >
              <PlusIcon size={12} />
              Add Prompt
            </Button>
          </div>
        </div>

        {/* Empty state - only show if actions are visible */}
        {areActionsVisible && (
          <div
            data-testid="suggested-actions"
            className="grid sm:grid-cols-2 gap-2 w-full"
          >
            <div className="col-span-2 text-center text-muted-foreground py-8">
              No suggested actions available. Click &ldquo;Add Prompt&rdquo; to
              create your first one.
            </div>
          </div>
        )}

        {/* Add prompt dialog for empty state */}
        <PromptDialog
          isOpen={isAddingPrompt}
          onClose={() => setIsAddingPrompt(false)}
          onSuccess={handlePromptUpdated}
        />
      </div>
    );
  }

  // If headerOnly mode, just render the buttons
  if (headerOnly) {
    return (
      <div className="flex items-center justify-end gap-2 pt-4 pb-1">
        <Button
          onClick={handleToggleActions}
          size="sm"
          variant="outline"
          type="button"
          className="flex items-center gap-2 text-xs h-8 px-3"
        >
          {areActionsVisible ? (
            <>
              <EyeOffIcon size={12} />
              Hide Prompts
            </>
          ) : (
            <>
              <EyeIcon size={12} />
              Show Prompts
            </>
          )}
        </Button>
        <Button
          onClick={handleAddPrompt}
          size="sm"
          variant="outline"
          type="button"
          className="flex items-center gap-2 text-xs h-8 px-3"
        >
          <PlusIcon size={12} />
          Add Prompt
        </Button>

        {/* Add prompt dialog */}
        <PromptDialog
          isOpen={isAddingPrompt}
          onClose={() => setIsAddingPrompt(false)}
          onSuccess={handlePromptUpdated}
        />
      </div>
    );
  }

  // If gridOnly mode, just render the grid without header
  if (gridOnly) {
    if (prompts.length === 0) {
      return (
        <div className="w-full mx-auto md:max-w-3xl lg:max-w-4xl xl:max-w-5xl">
          {areActionsVisible && (
            <div
              data-testid="suggested-actions"
              className="grid sm:grid-cols-2 gap-2 w-full"
            >
              <div className="col-span-2 text-center text-muted-foreground py-8">
                No suggested actions available.
              </div>
            </div>
          )}
        </div>
      );
    }

    // Return simplified grid for mobile
    return (
      <div className="w-full mx-auto md:max-w-3xl lg:max-w-4xl xl:max-w-5xl">
        {areActionsVisible && (
          <div
            data-testid="suggested-actions"
            className="grid sm:grid-cols-2 gap-2 w-full pb-0"
          >
            {prompts.map((prompt) => (
              <button
                key={prompt.id}
                type="button"
                className="p-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors text-left"
                onClick={() => {
                  if (prompt.prompt) {
                    setInput(prompt.prompt);
                    if (textareaRef?.current) {
                      textareaRef.current.focus();
                    }
                    if (adjustHeight) {
                      adjustHeight();
                    }
                  }
                }}
              >
                <div className="text-sm font-medium mb-1">{prompt.title}</div>
                <div className="text-xs text-muted-foreground line-clamp-2">
                  {prompt.prompt}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`w-full mx-auto md:max-w-3xl lg:max-w-4xl xl:max-w-5xl ${areActionsVisible ? 'pb-4' : 'pb-1'}`}
    >
      {/* Header with toggle and Add Prompt buttons */}
      <div
        className={`flex items-center justify-between ${areActionsVisible ? 'mb-2' : 'mb-1'}`}
      >
        <h3
          className={`text-sm pl-1 font-medium text-foreground ${areActionsVisible ? 'visible' : 'invisible'}`}
        >
          Suggested Actions
        </h3>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleToggleActions}
            size="sm"
            variant="outline"
            type="button"
            className="flex items-center gap-2 text-xs h-8 px-3"
          >
            {areActionsVisible ? (
              <>
                <EyeOffIcon size={12} />
                Hide Prompts
              </>
            ) : (
              <>
                <EyeIcon size={12} />
                Show Prompts
              </>
            )}
          </Button>
          <Button
            onClick={handleAddPrompt}
            size="sm"
            variant="outline"
            type="button"
            className="flex items-center gap-2 text-xs h-8 px-3"
          >
            <PlusIcon size={12} />
            Add Prompt
          </Button>
        </div>
      </div>

      {/* Progress indicator during reordering */}
      {areActionsVisible && (isReordering || isDragging) && (
        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          <div className="size-3 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin" />
          {isReordering ? 'Saving new order...' : 'Drag to reorder cards'}
        </div>
      )}

      {/* Grid of prompts with drop zones - only show if actions are visible */}
      {areActionsVisible && (
        <div
          data-testid="suggested-actions"
          className="grid sm:grid-cols-2 gap-2 w-full relative"
        >
          {prompts.map((prompt, index) => (
            <div key={prompt.id} className="relative group">
              {/* Vertical drop indicators on left and right sides */}
              {isDragging && draggedItemId !== prompt.id && (
                <>
                  {/* Left side drop zone */}
                  <div
                    className="absolute -left-1 inset-y-0 w-2 z-20 flex items-center justify-center"
                    role="button"
                    tabIndex={-1}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setHoveredDropZone(index * 2); // Even numbers for left side
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setHoveredDropZone(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDrop(index);
                    }}
                  >
                    {hoveredDropZone === index * 2 && (
                      <motion.div
                        initial={{ opacity: 0, scaleY: 0.5 }}
                        animate={{ opacity: 1, scaleY: 1 }}
                        exit={{ opacity: 0, scaleY: 0.5 }}
                        className="w-1 h-full bg-primary rounded-full shadow-lg"
                      />
                    )}
                  </div>

                  {/* Right side drop zone */}
                  <div
                    className="absolute -right-1 inset-y-0 w-2 z-20 flex items-center justify-center"
                    role="button"
                    tabIndex={-1}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setHoveredDropZone(index * 2 + 1); // Odd numbers for right side
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setHoveredDropZone(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDrop(index + 1);
                    }}
                  >
                    {hoveredDropZone === index * 2 + 1 && (
                      <motion.div
                        initial={{ opacity: 0, scaleY: 0.5 }}
                        animate={{ opacity: 1, scaleY: 1 }}
                        exit={{ opacity: 0, scaleY: 0.5 }}
                        className="w-1 h-full bg-primary rounded-full shadow-lg"
                      />
                    )}
                  </div>
                </>
              )}

              {/* Draggable prompt card */}
              <div
                draggable
                role="button"
                tabIndex={0}
                onDragStart={(e) => {
                  handleDragStart(prompt);
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', prompt.id);
                  // Add visual feedback for the drag image
                  e.dataTransfer.setDragImage(e.currentTarget, 0, 0);
                }}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  // Get the dragged item ID
                  const draggedId = e.dataTransfer.getData('text/plain');
                  if (!draggedId || draggedId === prompt.id) return;

                  // Find the drop target index
                  const targetIndex = prompts.findIndex(
                    (p) => p.id === prompt.id,
                  );
                  handleDrop(targetIndex);
                }}
                className={`cursor-grab active:cursor-grabbing transition-all duration-200 ${
                  isDragging && draggedItemId === prompt.id
                    ? 'opacity-50 scale-105 z-50'
                    : 'z-10'
                }`}
              >
                <PromptCard
                  prompt={prompt}
                  isDragging={isDragging && draggedItemId === prompt.id}
                />
              </div>
            </div>
          ))}

          {/* Drop zone at the very end */}
          {isDragging && (
            <div
              className="absolute -right-4 inset-y-0 w-4 z-20 flex items-center justify-center"
              role="button"
              tabIndex={-1}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setHoveredDropZone(prompts.length * 2);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setHoveredDropZone(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(prompts.length);
              }}
            >
              {hoveredDropZone === prompts.length * 2 && (
                <motion.div
                  initial={{ opacity: 0, scaleY: 0.5 }}
                  animate={{ opacity: 1, scaleY: 1 }}
                  exit={{ opacity: 0, scaleY: 0.5 }}
                  className="w-1 h-full bg-primary rounded-full shadow-lg"
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Edit/Add prompt dialog */}
      <PromptDialog
        prompt={editingPrompt || undefined}
        isOpen={!!editingPrompt || isAddingPrompt}
        onClose={() => {
          setEditingPrompt(null);
          setIsAddingPrompt(false);
        }}
        onSuccess={handlePromptUpdated}
      />

      {/* Delete prompt dialog */}
      {deletingPrompt && (
        <DeletePromptDialog
          prompt={deletingPrompt}
          isOpen={!!deletingPrompt}
          onClose={() => setDeletingPrompt(null)}
          onSuccess={handlePromptUpdated}
        />
      )}
    </div>
  );
}

export const SuggestedActions = memo(
  PureSuggestedActions,
  (prevProps, nextProps) => {
    if (prevProps.chatId !== nextProps.chatId) return false;
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType)
      return false;
    if (prevProps.textareaRef !== nextProps.textareaRef) return false;
    if (prevProps.adjustHeight !== nextProps.adjustHeight) return false;
    if (prevProps.setModelId !== nextProps.setModelId) return false;

    return true;
  },
);
