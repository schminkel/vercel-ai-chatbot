import {
  customProvider
} from 'ai';
import { xai } from '@ai-sdk/xai';
import { openai } from '@ai-sdk/openai';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';
import { isTestEnvironment } from '../constants';

export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
        'artifact-model': artifactModel,
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
      },
      imageModels: {
        // xAI models
        'xai-image': xai.imageModel('grok-2-image-1212'),
      },
    });