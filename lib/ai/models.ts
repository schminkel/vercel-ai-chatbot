export const DEFAULT_CHAT_MODEL: string = 'openai-gpt-4.1-mini';

export interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  // xAI models
  {
    id: 'xai-grok-4',
    name: 'Grok 4 (xAI)',
    description: 'Grok 4 model from xAI (reasoning and vision)',
  },
  {
    id: 'xai-grok-3',
    name: 'Grok 3 (xAI)',
    description: 'Grok 3 model from xAI (flagship model)',
  },
  {
    id: 'xai-grok-3-mini',
    name: 'Grok 3 Mini (xAI)',
    description: 'Grok 3 Mini model from xAI (smaller, faster)',
  },
  {
    id: 'xai-image',
    name: 'Grok 2 Image (xAI)',
    description: 'Grok 2 Image model from xAI (image generation)',
  },
  // OpenAI models
  {
    id: 'openai-gpt-4.1',
    name: 'GPT-4.1 (OpenAI)',
    description: 'Latest GPT-4.1 model from OpenAI (flagship model)',
  },
  {
    id: 'openai-gpt-4.1-mini',
    name: 'GPT-4.1 Mini (OpenAI)',
    description: 'GPT-4.1 Mini model from OpenAI (smaller, faster)',
  },
];
