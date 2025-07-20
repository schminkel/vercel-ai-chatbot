import type {
  CoreAssistantMessage,
  CoreToolMessage,
  UIMessage,
  UIMessagePart,
} from 'ai';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { DBMessage, Document } from '@/lib/db/schema';
import { ChatSDKError, type ErrorCode } from './errors';
import type { ChatMessage, ChatTools, CustomUIDataTypes } from './types';
import { formatISO } from 'date-fns';
import { chatModels } from './ai/models';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fetcher = async (url: string) => {
  const response = await fetch(url);

  if (!response.ok) {
    const { code, cause } = await response.json();
    throw new ChatSDKError(code as ErrorCode, cause);
  }

  return response.json();
};

export async function fetchWithErrorHandlers(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  try {
    const response = await fetch(input, init);

    if (!response.ok) {
      const { code, cause } = await response.json();
      throw new ChatSDKError(code as ErrorCode, cause);
    }

    return response;
  } catch (error: unknown) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new ChatSDKError('offline:chat');
    }

    throw error;
  }
}

export function getLocalStorage(key: string) {
  if (typeof window !== 'undefined') {
    return JSON.parse(localStorage.getItem(key) || '[]');
  }
  return [];
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getCurrentModelFromCookie(fallbackModel: string): string {
  if (typeof document === 'undefined') {
    return fallbackModel;
  }
  
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('chat-model='))
    ?.split('=')[1] || fallbackModel;
}

export function getDisplayModelName(modelId: string): string {
  // Find the model in chatModels and return its display name, fallback to modelId
  const model = chatModels.find((m) => m.id === modelId);
  if (model) {
    // Prefer a more compact name if possible (strip provider in parentheses)
    const match = model.name.match(/^(.*?)( \(.*\))?$/);
    if (match?.[1]) {
      return match[1];
    }
    return model.name;
  }
  return modelId;
}

export function isAttachmentModel(modelId: string): boolean {
  const model = chatModels.find((m) => m.id === modelId);
  return model?.uiConfiguration.attachments.enabled ?? false;
}

export function isFileTypeAllowed(modelId: string, fileType: string): boolean {
  const model = chatModels.find((m) => m.id === modelId);
  // If the model doesn't allow attachments, no file type is allowed
  if (!model?.uiConfiguration.attachments.enabled) return false;
  
  // If the model doesn't specify file types, all file types are allowed
  if (!model.uiConfiguration.attachments.fileTypes) return true;
  
  // Check if the file type is in the allowed list
  return model.uiConfiguration.attachments.fileTypes.includes(fileType);
}

export function getModelById(modelId: string) {
  return chatModels.find((m) => m.id === modelId);
}

export function shouldDisableInputAfterResponse(messages: Array<UIMessage>, currentModel: string): boolean {
  if (messages.length === 0) return false;
  
  // Get the current model configuration
  const currentModelConfig = getModelById(currentModel);
  if (!currentModelConfig) return false;
  
  // If current model supports multi-request, don't disable
  if (currentModelConfig.uiConfiguration.multiRequest) {
    return false;
  }
  
  // Find the last assistant message
  const lastAssistantMessage = [...messages].reverse().find(message => message.role === 'assistant');
  
  if (!lastAssistantMessage) return false;
  
  // Extract model ID from the assistant message parts
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
  
  const messageModelId = getModelIdFromParts(lastAssistantMessage.parts);
  
  // If we can't determine the model from the message, fall back to current model
  const modelToCheck = messageModelId || currentModel;
  const modelConfig = getModelById(modelToCheck);
  
  // If the model that generated the last response doesn't support multi-request, disable input
  return modelConfig ? !modelConfig.uiConfiguration.multiRequest : false;
}

export function getLastUsedModelFromMessages(messages: Array<UIMessage>, fallbackModel: string): string {
  if (messages.length === 0) return fallbackModel;

  // Find the last assistant message
  const lastAssistantMessage = [...messages].reverse().find(message => message.role === 'assistant');
  
  if (!lastAssistantMessage) return fallbackModel;

  // Extract model ID from the assistant message parts
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

  const messageModelId = getModelIdFromParts(lastAssistantMessage.parts);
  
  // Return the model ID from the message, or fallback if not found
  return messageModelId || fallbackModel;
}

type ResponseMessageWithoutId = CoreToolMessage | CoreAssistantMessage;
type ResponseMessage = ResponseMessageWithoutId & { id: string };

export function getMostRecentUserMessage(messages: Array<UIMessage>) {
  const userMessages = messages.filter((message) => message.role === 'user');
  return userMessages.at(-1);
}

export function getDocumentTimestampByIndex(
  documents: Array<Document>,
  index: number,
) {
  if (!documents) return new Date();
  if (index > documents.length) return new Date();

  return documents[index].createdAt;
}

export function getTrailingMessageId({
  messages,
}: {
  messages: Array<ResponseMessage>;
}): string | null {
  const trailingMessage = messages.at(-1);

  if (!trailingMessage) return null;

  return trailingMessage.id;
}

export function sanitizeText(text: string) {
  return text.replace('<has_function_call>', '');
}

export function convertToUIMessages(messages: DBMessage[]): ChatMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role as 'user' | 'assistant' | 'system',
    parts: message.parts as UIMessagePart<CustomUIDataTypes, ChatTools>[],
    metadata: {
      createdAt: formatISO(message.createdAt),
    },
  }));
}

export function getTextFromMessage(message: ChatMessage): string {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');
}
