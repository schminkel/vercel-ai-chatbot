'use client';

import { DefaultChatTransport } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useEffect, useState, useMemo } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { ChatHeader } from '@/components/chat-header';
import type { Vote } from '@/lib/db/schema';
import {
  fetcher,
  fetchWithErrorHandlers,
  generateUUID,
  getCurrentModelFromCookie,
  getLastUsedModelFromMessages,
} from '@/lib/utils';
import { Artifact } from './artifact';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import { SuggestedActions } from './suggested-actions';
import type { VisibilityType } from './visibility-selector';
import { useArtifactSelector } from '@/hooks/use-artifact';
import { unstable_serialize } from 'swr/infinite';
import { getChatHistoryPaginationKey } from './sidebar-history';
import { toast } from './toast';
import type { Session } from 'next-auth';
import { useSearchParams } from 'next/navigation';
import { useChatVisibility } from '@/hooks/use-chat-visibility';
import { useAutoResume } from '@/hooks/use-auto-resume';
import { ChatSDKError } from '@/lib/errors';
import type { Attachment, ChatMessage } from '@/lib/types';
import { useDataStream } from './data-stream-provider';
import { DotsBackground } from './ui/dots-background';

export function Chat({
  id,
  initialMessages,
  initialChatModel,
  initialVisibilityType,
  isReadonly,
  session,
  autoResume,
}: {
  id: string;
  initialMessages: ChatMessage[];
  initialChatModel: string;
  initialVisibilityType: VisibilityType;
  isReadonly: boolean;
  session: Session;
  autoResume: boolean;
}) {
  const { visibilityType } = useChatVisibility({
    chatId: id,
    initialVisibilityType,
  });

  const { mutate } = useSWRConfig();
  const { setDataStream } = useDataStream();

  const [input, setInput] = useState<string>('');
  const [currentModel, setCurrentModel] = useState<string>(initialChatModel);

  // Shared state for mobile suggested actions coordination
  const [mobileActionsVisible, setMobileActionsVisible] = useState<
    boolean | null
  >(null);

  // Initialize mobile actions visibility based on screen size
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setMobileActionsVisible(window.innerWidth >= 768);
    }
  }, []);

  // Handler for toggling mobile actions visibility
  const handleToggleMobileActions = () => {
    setMobileActionsVisible(!mobileActionsVisible);
  };

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    regenerate,
    resumeStream,
  } = useChat<ChatMessage>({
    id,
    messages: initialMessages,
    experimental_throttle: 100,
    generateId: generateUUID,
    transport: new DefaultChatTransport({
      api: '/api/chat',
      fetch: fetchWithErrorHandlers,
      prepareSendMessagesRequest({ messages, id, body }) {
        // Get the current model at the time of sending, not when useChat was initialized
        const currentModelAtSendTime =
          getCurrentModelFromCookie(initialChatModel);

        console.log('📤 Sending message with model:', currentModelAtSendTime);
        console.log('🔍 initialChatModel from props:', initialChatModel);
        console.log('🍪 currentModel from cookie:', currentModelAtSendTime);

        return {
          body: {
            id,
            message: messages.at(-1),
            selectedChatModel: currentModelAtSendTime, // Use fresh model value
            selectedVisibilityType: visibilityType,
            ...body,
          },
        };
      },
    }),
    onData: (dataPart) => {
      setDataStream((ds) => (ds ? [...ds, dataPart] : []));
    },
    onFinish: () => {
      mutate(unstable_serialize(getChatHistoryPaginationKey));
    },
    onError: (error) => {
      if (error instanceof ChatSDKError) {
        toast({
          type: 'error',
          description: error.message,
        });
      }
    },
  });

  const searchParams = useSearchParams();
  const query = searchParams.get('query');

  const [hasAppendedQuery, setHasAppendedQuery] = useState(false);

  useEffect(() => {
    if (query && !hasAppendedQuery) {
      sendMessage({
        role: 'user' as const,
        parts: [{ type: 'text', text: query }],
      });

      setHasAppendedQuery(true);
      window.history.replaceState({}, '', `/chat/${id}`);
    }
  }, [query, sendMessage, hasAppendedQuery, id]);

  // Monitor cookie changes to update current model
  useEffect(() => {
    const updateCurrentModel = () => {
      const cookieModel = getCurrentModelFromCookie(initialChatModel);
      setCurrentModel(cookieModel);
    };

    // Update immediately
    updateCurrentModel();
  }, [initialChatModel]);

  const { data: votes } = useSWR<Array<Vote>>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher,
  );

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  // Calculate the model ID that should be selected in the model selector
  // Based on the last used model in this specific chat's conversation
  const selectedModelId = useMemo(() => {
    return getLastUsedModelFromMessages(messages, initialChatModel);
  }, [messages, initialChatModel]);

  // Update the cookie when the selected model changes due to chat switching
  // This ensures that new messages use the same model as the chat's history
  useEffect(() => {
    const cookieModel = getCurrentModelFromCookie(initialChatModel);
    if (
      selectedModelId !== cookieModel &&
      selectedModelId !== initialChatModel
    ) {
      // Only update cookie if the selected model is different and it's from actual message history
      if (messages.length > 0) {
        // Update the cookie to match the chat's last used model
        document.cookie = `chat-model=${selectedModelId}; path=/; max-age=${60 * 60 * 24 * 365}`; // 1 year
        // Also update the local currentModel state
        setCurrentModel(selectedModelId);
      }
    }
  }, [selectedModelId, initialChatModel, messages.length]);

  useAutoResume({
    autoResume,
    initialMessages,
    resumeStream,
    setMessages,
  });

  return (
    <>
      <div className="flex flex-col min-w-0 h-screen sm:h-dvh bg-background overflow-x-hidden relative chat-container-mobile">
        <DotsBackground />

        <ChatHeader
          chatId={id}
          selectedModelId={selectedModelId}
          selectedVisibilityType={initialVisibilityType}
          isReadonly={isReadonly}
          session={session}
          hasMessages={messages.length > 0}
        />

        <div className="pt-0 md:pt-0 max-[767px]:pt-16 flex-1 overflow-hidden chat-messages-mobile">
          <Messages
            chatId={id}
            status={status}
            votes={votes}
            messages={messages}
            setMessages={setMessages}
            regenerate={regenerate}
            isReadonly={isReadonly}
            isArtifactVisible={isArtifactVisible}
          />

          {/* Render only the suggested actions grid in scrollable area on mobile when no messages */}
          {messages.length === 0 &&
            attachments.length === 0 &&
            !isReadonly &&
            mobileActionsVisible && (
              <div className="block md:hidden px-4">
                <SuggestedActions
                  setInput={setInput}
                  chatId={id}
                  selectedVisibilityType={visibilityType}
                  textareaRef={undefined}
                  adjustHeight={() => {}}
                  setModelId={setCurrentModel}
                  sharedActionsVisible={mobileActionsVisible}
                  onToggleActions={handleToggleMobileActions}
                  gridOnly={true}
                />
              </div>
            )}
        </div>

        {/* Mobile buttons positioned directly above input */}
        {messages.length === 0 && attachments.length === 0 && !isReadonly && (
          <div className="block md:hidden px-4 pb-3">
            <SuggestedActions
              setInput={setInput}
              chatId={id}
              selectedVisibilityType={visibilityType}
              textareaRef={undefined}
              adjustHeight={() => {}}
              setModelId={setCurrentModel}
              sharedActionsVisible={mobileActionsVisible}
              onToggleActions={handleToggleMobileActions}
              headerOnly={true}
            />
          </div>
        )}

        <form className="mb-2 md:mb-0 flex mx-auto px-4 bg-background pb-4 md:pb-6 max-[767px]:pb-2 gap-2 w-full md:max-w-3xl lg:max-w-4xl xl:max-w-5xl shrink-0 relative z-10 max-[767px]:chat-input-mobile-sticky">
          {!isReadonly && (
            <MultimodalInput
              chatId={id}
              input={input}
              setInput={setInput}
              status={status}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments}
              messages={messages}
              setMessages={setMessages}
              sendMessage={sendMessage}
              selectedVisibilityType={visibilityType}
              currentModel={currentModel}
              setModelId={setCurrentModel}
            />
          )}
        </form>
      </div>

      <Artifact
        chatId={id}
        input={input}
        setInput={setInput}
        status={status}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        sendMessage={sendMessage}
        messages={messages}
        setMessages={setMessages}
        regenerate={regenerate}
        votes={votes}
        isReadonly={isReadonly}
        selectedVisibilityType={visibilityType}
        currentModel={currentModel}
      />
    </>
  );
}
