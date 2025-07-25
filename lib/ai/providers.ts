import { customProvider } from 'ai';
import { xai } from '@ai-sdk/xai';
import { createOpenAI, openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { artifactModel, chatModel, reasoningModel } from './models.test';
import { isTestEnvironment } from '../constants';

const mockOpenAI = createOpenAI({
  baseURL:
    process.env.OPENAI_MOCK_API_URL ||
    'http://localhost:3000/mock/api/openai/v1',
});

export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'title-model': mockOpenAI('gpt-4.1-nano'),
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'artifact-model': artifactModel,

        // xAI models
        'xai-grok-4': chatModel,
        'xai-grok-3': chatModel,
        'xai-grok-3-mini': chatModel,

        // OpenAI models
        'openai-gpt-4.1': mockOpenAI('gpt-4.1'),
        'openai-gpt-4.1-mini': mockOpenAI('gpt-4.1-mini'),
        'openai-gpt-4.1-nano': mockOpenAI('gpt-4.1-nano'),

        // Anthropic models
        'anthropic-claude-opus-4': chatModel,
        'anthropic-claude-sonnet-4': chatModel,
        'anthropic-claude-haiku-3.5': chatModel,
      },
    })
  : customProvider({
      languageModels: {
        // Model for the chat interface title
        'title-model': openai('gpt-4.1-nano'),

        // xAI models
        'xai-grok-4': xai('grok-4-0709'),
        'xai-grok-3': xai('grok-3'),
        'xai-grok-3-mini': xai('grok-3-mini'),

        // OpenAI models
        'openai-gpt-4.1': openai('gpt-4.1'),
        'openai-gpt-4.1-mini': openai('gpt-4.1-mini'),
        'openai-gpt-4.1-nano': openai('gpt-4.1-nano'),

        // Anthropic models
        'anthropic-claude-opus-4': anthropic('claude-3-opus-20240229'),
        'anthropic-claude-sonnet-4': anthropic('claude-3-5-sonnet-20241022'),
        'anthropic-claude-haiku-3.5': anthropic('claude-3-5-haiku-20241022'),
      },
      imageModels: {
        // xAI models
        'xai-image': xai.imageModel('grok-2-image-1212'),
        // OpenAI models
        'openai-gpt-image-1': openai.imageModel('gpt-image-1'),
      },
    });
