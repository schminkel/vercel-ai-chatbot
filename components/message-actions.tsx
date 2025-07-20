import { useSWRConfig } from 'swr';
import { useCopyToClipboard } from 'usehooks-ts';

import type { Vote } from '@/lib/db/schema';

import { CopyIcon, ThumbDownIcon, ThumbUpIcon, SparklesIcon, CoinsIcon } from './icons';
import { Button } from './ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import { memo } from 'react';
import equal from 'fast-deep-equal';
import { toast } from 'sonner';
import type { ChatMessage } from '@/lib/types';
import { calculateTokenCost, formatCost } from '@/lib/token-costs';
import { getDisplayModelName } from '@/lib/utils';
import { useIsVerySmallScreen } from '@/hooks/use-very-small-screen';

// Helper function to extract modelId from message parts
const getModelIdFromParts = (parts: any[]): string | null => {
  // First try to find model info in 'data-modelInfo' parts (from streaming)
  const modelInfoPart = parts.find(part => part.type === 'data-modelInfo');
  if (modelInfoPart?.data) {
    try {
      const modelInfo = JSON.parse(modelInfoPart.data);
      return modelInfo.modelId || null;
    } catch {
      // Fall through to try other method
    }
  }
  
  // Then try to find model info in 'data' parts (from database storage)
  const dataPart = parts.find(part => part.type === 'data' && part.data?.modelId);
  if (dataPart?.data?.modelId) {
    return dataPart.data.modelId;
  }
  
  return null;
};

// Helper function to extract usage information from message parts
const getUsageFromParts = (parts: any[]): any | null => {
  // First try to find usage data in 'data-usage' parts (from streaming)
  const usagePart = parts.find(part => part.type === 'data-usage');
  if (usagePart?.data) {
    try {
      const usageInfo = JSON.parse(usagePart.data);
      return usageInfo.usage || null;
    } catch {
      // Fall through to try other method
    }
  }
  
  // Then try to find usage data in 'data' parts (from database storage)
  const dataPart = parts.find(part => part.type === 'data' && part.data?.usage);
  if (dataPart?.data?.usage) {
    return dataPart.data.usage;
  }
  
  return null;
};

export function PureMessageActions({
  chatId,
  message,
  vote,
  isLoading,
}: {
  chatId: string;
  message: ChatMessage;
  vote: Vote | undefined;
  isLoading: boolean;
}) {
  const { mutate } = useSWRConfig();
  const [_, copyToClipboard] = useCopyToClipboard();
  const isVerySmallScreen = useIsVerySmallScreen();

  if (isLoading) return null;
  if (message.role === 'user') return null;

  const modelID = getModelIdFromParts(message.parts) 

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-row gap-2 items-center flex-wrap">
        <div className="flex flex-row gap-2 items-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="py-1 px-2 h-fit text-muted-foreground"
              variant="outline"
              onClick={async () => {
                const textFromParts = message.parts
                  ?.filter((part) => part.type === 'text')
                  .map((part) => part.text)
                  .join('\n')
                  .trim();

                if (!textFromParts) {
                  toast.error("There's no text to copy!");
                  return;
                }

                await copyToClipboard(textFromParts);
                toast.success('Copied to clipboard!');
              }}
            >
              <CopyIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-testid="message-upvote"
              className="py-1 px-2 h-fit text-muted-foreground !pointer-events-auto"
              disabled={vote?.isUpvoted}
              variant="outline"
              onClick={async () => {
                const upvote = fetch('/api/vote', {
                  method: 'PATCH',
                  body: JSON.stringify({
                    chatId,
                    messageId: message.id,
                    type: 'up',
                  }),
                });

                toast.promise(upvote, {
                  loading: 'Upvoting Response...',
                  success: () => {
                    mutate<Array<Vote>>(
                      `/api/vote?chatId=${chatId}`,
                      (currentVotes) => {
                        if (!currentVotes) return [];

                        const votesWithoutCurrent = currentVotes.filter(
                          (vote) => vote.messageId !== message.id,
                        );

                        return [
                          ...votesWithoutCurrent,
                          {
                            chatId,
                            messageId: message.id,
                            isUpvoted: true,
                          },
                        ];
                      },
                      { revalidate: false },
                    );

                    return 'Upvoted Response!';
                  },
                  error: 'Failed to upvote response.',
                });
              }}
            >
              <ThumbUpIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Upvote Response</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-testid="message-downvote"
              className="py-1 px-2 h-fit text-muted-foreground !pointer-events-auto"
              variant="outline"
              disabled={vote && !vote.isUpvoted}
              onClick={async () => {
                const downvote = fetch('/api/vote', {
                  method: 'PATCH',
                  body: JSON.stringify({
                    chatId,
                    messageId: message.id,
                    type: 'down',
                  }),
                });

                toast.promise(downvote, {
                  loading: 'Downvoting Response...',
                  success: () => {
                    mutate<Array<Vote>>(
                      `/api/vote?chatId=${chatId}`,
                      (currentVotes) => {
                        if (!currentVotes) return [];

                        const votesWithoutCurrent = currentVotes.filter(
                          (vote) => vote.messageId !== message.id,
                        );

                        return [
                          ...votesWithoutCurrent,
                          {
                            chatId,
                            messageId: message.id,
                            isUpvoted: false,
                          },
                        ];
                      },
                      { revalidate: false },
                    );

                    return 'Downvoted Response!';
                  },
                  error: 'Failed to downvote response.',
                });
              }}
            >
              <ThumbDownIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Downvote Response</TooltipContent>
        </Tooltip>
        </div>

        {/* Model ID and Usage info - separate line on small screens */}
        <div className="flex flex-row gap-2 items-center flex-wrap w-full sm:w-auto">
        {/* Model ID metadata display - only show if modelId exists */}
        {modelID && (
          <div className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground rounded">
            <SparklesIcon size={12} />
            <span className="font-mono">{getDisplayModelName(modelID)}</span>
          </div>
        )}

        {/* Usage information display - only show if usage data exists */}
        {message.parts && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 px-2 py-1 text-2xs text-muted-foreground rounded font-mono">
            {(() => {
              const usage = getUsageFromParts(message.parts);
              if (usage) {
                const cost = modelID ? calculateTokenCost(modelID, usage) : null;
                
                // Handle image generation usage display
                if (usage.imagesGenerated > 0) {
                  return (
                    <div className="flex items-center gap-1">
                      <CoinsIcon size={14}/>
                      <span>Images:{usage.imagesGenerated}</span>
                      {cost !== null && <span>| Cost:{formatCost(cost)}</span>}
                    </div>
                  );
                }
                
                // Handle token-based usage display
                // Count the number of attributes to display
                const attributes = [];
                attributes.push(`Input:${usage.inputTokens}`);
                attributes.push(`Output:${usage.outputTokens}`);
                if (usage.reasoningTokens > 0) attributes.push(`Reasoning:${usage.reasoningTokens}`);
                if (usage.cachedInputTokens > 0) attributes.push(`Cached:${usage.cachedInputTokens}`);
                if (cost !== null) attributes.push(`Cost:${formatCost(cost)}`);
                
                // On very small screens (iPhone SE and similar), show only cost
                if (isVerySmallScreen) {
                  const costAttribute = attributes.find(attr => attr.startsWith('Cost:'));
                  return (
                    <div className="flex items-center gap-1">
                      <CoinsIcon size={14}/>
                      {costAttribute ? (
                        <span>{costAttribute}</span>
                      ) : (
                        // If no cost available, show the first attribute as fallback
                        <span>{attributes[0]}</span>
                      )}
                    </div>
                  );
                }
                
                // On mobile (< sm): Split into two lines if more than 3 attributes
                // On desktop (>= sm): Always show as single line
                return (
                  <>
                    {/* Mobile layout: always split on very small screens, split if > 3 on larger mobile */}
                    <div className="sm:hidden">
                      {/* Always split into 2 lines on iPhone SE and smaller */}
                      <div className="flex items-center gap-1">
                        <CoinsIcon size={14}/>
                        {attributes.slice(0, 2).map((attr, index) => (
                          <span key={index}>
                            {index > 0 && '| '}{attr}
                          </span>
                        ))}
                      </div>
                      {attributes.length > 2 && (
                        <div className="flex items-center gap-1 ml-[18px]">
                          {attributes.slice(2).map((attr, index) => (
                            <span key={index}>
                              {index > 0 && '| '}{attr}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Desktop layout: always single line */}
                    <div className="hidden sm:flex items-center gap-1">
                      <CoinsIcon size={14}/>
                      {attributes.map((attr, index) => (
                        <span key={index}>
                          {index > 0 && '| '}{attr}
                        </span>
                      ))}
                    </div>
                  </>
                );
              }
              return null;
            })()}
          </div>
        )}
        </div>

      </div>
    </TooltipProvider>
  );
}

export const MessageActions = memo(
  PureMessageActions,
  (prevProps, nextProps) => {
    if (!equal(prevProps.vote, nextProps.vote)) return false;
    if (prevProps.isLoading !== nextProps.isLoading) return false;

    return true;
  },
);
