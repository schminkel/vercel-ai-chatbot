'use client';

import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { memo } from 'react';
import type { VisibilityType } from './visibility-selector';
import type { Dispatch, SetStateAction } from 'react';
import { saveChatModelAsCookie } from '@/app/(chat)/actions';
import { getDisplayModelName } from '@/lib/utils';

interface SuggestedActionsProps {
  chatId: string;
  setInput: Dispatch<SetStateAction<string>>;
  selectedVisibilityType: VisibilityType;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  adjustHeight?: () => void;
  setModelId?: (modelId: string) => void;
}

function PureSuggestedActions({
  setInput,
  textareaRef,
  adjustHeight,
  setModelId,
}: SuggestedActionsProps) {
  const suggestedActions = [
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
      title: '2Help me write an essay',
      prompt: `Help me write an essay about silicon valley`,
      modelId: 'anthropic-claude-sonnet-4',
    },
    {
      title: '2What is the weather',
      prompt: 'What is the weather in San Francisco?',
      modelId: 'xai-grok-3-mini',
    },
  ];

  return (
    <div
      data-testid="suggested-actions"
      className="grid sm:grid-cols-2 gap-2 w-full"
    >
      {suggestedActions.map((suggestedAction, index) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.05 * index }}
          key={`suggested-action-${suggestedAction.title}-${index}`}
          className="block"
        >
          <Button
            type="button"
            variant="ghost"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();

              // Set the input with the suggested action title and prompt
              const newInput = "# "+ suggestedAction.title + "\n" + suggestedAction.prompt + "\n\n";
              setInput(newInput);
              
              // Set the model if specified and setModelId is available
              if (suggestedAction.modelId && setModelId) {
                setModelId(suggestedAction.modelId);
                saveChatModelAsCookie(suggestedAction.modelId);
              }
              
              // Focus the textarea and let React's useEffect handle height adjustment
              // Use requestAnimationFrame to ensure DOM is updated after state change
              requestAnimationFrame(() => {
                textareaRef?.current?.focus();
                // Don't call adjustHeight here - it will be called by the handleInput effect
              });
            }}
            className="text-left border rounded-xl mx-auto sm:mx-0 px-4 py-3.5 text-sm flex-1 gap-1 sm:flex-col w-full h-auto justify-start items-start relative overflow-hidden max-w-xs sm:max-w-full"
          >
            <div className="flex flex-col gap-1 w-full">
              <span className="font-medium">{suggestedAction.title}</span>
              <div className="overflow-hidden">
                <span className="text-muted-foreground truncate">
                  {suggestedAction.prompt}
                </span>
              </div>
              <span className="text-muted-foreground truncate">
                &nbsp;
              </span>
            </div>
            
            {/* Model indicator in bottom right corner */}
            {suggestedAction.modelId && (
              <div className="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-1 text-mono text-xs text-muted-foreground">
                <svg
                  strokeLinejoin="round"
                  viewBox="0 0 22 18"
                >
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
                  {getDisplayModelName(suggestedAction.modelId)}
                </span>
              </div>
            )}
          </Button>
        </motion.div>
      ))}
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
