'use client';

import { startTransition, useMemo, useOptimistic, useState } from 'react';

import { saveChatModelAsCookie } from '@/app/(chat)/actions';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { chatModels } from '@/lib/ai/models';
import { cn } from '@/lib/utils';

import {
  CheckCircleFillIcon,
  ChevronDownIcon,
  LogoOpenAI,
  LogoXAI,
} from './icons';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import type { Session } from 'next-auth';

function getProviderIcon(modelId: string, size: number = 20) {
  if (modelId.startsWith('openai-')) {
    return <LogoOpenAI size={size} />;
  }
  if (modelId.startsWith('xai-')) {
    return <LogoXAI size={size} />;
  }
  // Default fallback icon
  return <LogoOpenAI size={size} />;
}

export function ModelSelector({
  session,
  selectedModelId,
  className,
}: {
  session: Session;
  selectedModelId: string;
} & React.ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false);
  const [optimisticModelId, setOptimisticModelId] =
    useOptimistic(selectedModelId);

  const userType = session.user.type;
  const { availableChatModelIds } = entitlementsByUserType[userType];

  const availableChatModels = chatModels.filter((chatModel) =>
    availableChatModelIds.includes(chatModel.id),
  );

  const selectedChatModel = useMemo(
    () =>
      availableChatModels.find(
        (chatModel) => chatModel.id === optimisticModelId,
      ),
    [optimisticModelId, availableChatModels],
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        asChild
        className={cn(
          'w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
          className,
        )}
      >
        <Button
          data-testid="model-selector"
          variant="outline"
          className="md:px-2 md:h-[34px] gap-2"
        >
          {selectedChatModel && getProviderIcon(selectedChatModel.id, 16)}
          {selectedChatModel?.name}
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[300px]">
        {availableChatModels.map((chatModel, index) => {
          const { id } = chatModel;

          return (
            <div key={id}>
              <DropdownMenuItem
                data-testid={`model-selector-item-${id}`}
                onSelect={() => {
                  setOpen(false);

                  startTransition(() => {
                    setOptimisticModelId(id);
                    saveChatModelAsCookie(id);
                  });
                }}
                data-active={id === optimisticModelId}
                asChild
                className="data-[active=true]:bg-accent/80"
              >
                <button
                  type="button"
                  className="gap-4 group/item flex flex-row justify-between items-center w-full"
                >
                  <div className="flex flex-row gap-3 items-center">
                    <div className="flex-shrink-0">
                      {getProviderIcon(chatModel.id)}
                    </div>
                    <div className="flex flex-col gap-1 items-start">
                      <div>{chatModel.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {chatModel.description}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-medium">IN:</span>
                          {chatModel.inputTypes?.map((type, index) => (
                            <div key={type} className="flex items-center gap-0.5">
                              <span className="text-[10px]">{type}</span>
                              {index < (chatModel.inputTypes?.length || 0) - 1 && (
                                <span className="text-[10px]">,</span>
                              )}
                            </div>
                          ))}
                        </div>
                        <span className="text-[10px] text-muted-foreground/60">→</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-medium">OUT:</span>
                          {chatModel.outputTypes?.map((type, index) => (
                            <div key={type} className="flex items-center gap-0.5">
                              <span className="text-[10px]">{type}</span>
                              {index < (chatModel.outputTypes?.length || 0) - 1 && (
                                <span className="text-[10px]">,</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-foreground dark:text-foreground opacity-0 group-data-[active=true]/item:opacity-100">
                    <CheckCircleFillIcon />
                  </div>
                </button>
              </DropdownMenuItem>
              {index < availableChatModels.length - 1 && (
                <div className="border-b border-border/30 mx-2" />
              )}
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
