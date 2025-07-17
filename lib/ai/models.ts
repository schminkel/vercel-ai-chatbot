import { file, multipleOf } from "zod/v4";

export const DEFAULT_CHAT_MODEL: string = 'openai-gpt-4.1-mini';

export interface ChatModel {
  id: string;
  name: string;
  description: string;
  inputTypes?: Array<'text' | 'image'>;
  outputTypes?: Array<'text' | 'image'>;
  uiConfiguration: {
    attachments: {
      enabled: boolean;
      many?: boolean;
      maxSize?: number;
      fileTypes?: string[];
    };
    multiRequest: boolean;
  };
  costRating: {
    coins: number; // 0.5 to 4 with 0.5 increments
    fixedCost?: number; // For image models, cost per image in EUR
  };
}

export const chatModels: Array<ChatModel> = [
  // xAI models
  {
    id: 'xai-grok-4',
    name: 'Grok 4 (xAI)',
    description: 'Grok 4 model from xAI (reasoning and vision)',
    inputTypes: ['text', 'image'],
    outputTypes: ['text'],
    uiConfiguration: {
      attachments: {
        enabled: true,
        many: true,
        maxSize: 10 * 1024 * 1024, // 10 MB
        fileTypes: ['image/png', 'image/jpeg', 'image/gif'],
      },
      multiRequest: true,
    },
    costRating: {
      coins: 3, // Higher cost due to multimodal capabilities
    },
  },
  {
    id: 'xai-grok-3',
    name: 'Grok 3 (xAI)',
    description: 'Grok 3 model from xAI (flagship model)',
    inputTypes: ['text'],
    outputTypes: ['text'],
    uiConfiguration: {
      attachments: {
        enabled: false,
      },
      multiRequest: true,
    },
    costRating: {
      coins: 2.5, // High-end model pricing
    },
  },
  {
    id: 'xai-grok-3-mini',
    name: 'Grok 3 Mini (xAI)',
    description: 'Grok 3 Mini model from xAI (smaller, faster)',
    inputTypes: ['text'],
    outputTypes: ['text'],
    uiConfiguration: {
      attachments: {
        enabled: false,
      },
      multiRequest: true,
    },
    costRating: {
      coins: 1, // Budget option
    },
  },
  {
    id: 'xai-image',
    name: 'Grok 2 Image (xAI)',
    description: 'Grok 2 Image model from xAI (image generation)',
    inputTypes: ['text'],
    outputTypes: ['image'],
    uiConfiguration: {
      attachments: {
        enabled: false,
      },
      multiRequest: false,
    },
    costRating: {
      coins: 4,
      fixedCost: 0.07, // €0.07 per image
    },
  },
  // OpenAI models
  
  {
    id: 'openai-gpt-4.1',
    name: 'GPT-4.1 (OpenAI)',
    description: 'Latest GPT-4.1 model from OpenAI (flagship model)',
    inputTypes: ['text', 'image'], 
    outputTypes: ['text'],
    uiConfiguration: {
      attachments: {
        enabled: true,
        many: true,
        maxSize: 10 * 1024 * 1024,
        fileTypes: ['image/png', 'image/jpeg', 'image/gif', 'application/pdf'],
      },
      multiRequest: true,
    },
    costRating: {
      coins: 3, // Most expensive model
    },
  },
  {
    id: 'openai-gpt-4.1-mini',
    name: 'GPT-4.1 Mini (OpenAI)',
    description: 'GPT-4.1 Mini model from OpenAI (smaller, faster)',
    inputTypes: ['text', 'image'],
    outputTypes: ['text'],
    uiConfiguration: {
      attachments: {
        enabled: true,
        many: true,
        maxSize: 10 * 1024 * 1024,
        fileTypes: ['image/png', 'image/jpeg', 'image/gif', 'application/pdf'],
      },
      multiRequest: true,
    },
    costRating: {
      coins: 1.5, // Budget-friendly option
    },
  },
  {
    id: 'openai-gpt-4.1-nano',
    name: 'GPT-4.1 Nano (OpenAI)',
    description: 'GPT-4.1 Nano model from OpenAI (smallest, fastest)',
    inputTypes: ['text', 'image'],
    outputTypes: ['text'],
    uiConfiguration: {
      attachments: {
        enabled: true,
        many: true,
        maxSize: 10 * 1024 * 1024,
        fileTypes: ['image/png', 'image/jpeg', 'image/gif', 'application/pdf'],
      },
      multiRequest: true,
    },
    costRating: {
      coins: 0.5, // Most affordable option
    },
  },
  {
    id: 'openai-gpt-image-1',
    name: 'GPT Image 1 (OpenAI)',
    description: 'GPT Image 1 model from OpenAI (image editing and combining)',
    inputTypes: ['image', 'text'],
    outputTypes: ['image'],
    uiConfiguration: {
      attachments: {
        enabled: true,
        many: true,
        maxSize: 10 * 1024 * 1024,
        fileTypes: ['image/png', 'image/jpeg', 'image/gif'],
      },
      multiRequest: false,
    },
    costRating: {
      coins: 4,
      fixedCost: 0.04, // €0.04 per image
    },
  },
];
