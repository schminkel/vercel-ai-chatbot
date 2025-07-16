import { z } from 'zod';

const textPartSchema = z.object({
  type: z.enum(['text']),
  text: z.string().min(1).max(2000),
});

const filePartSchema = z.object({
  type: z.enum(['file']),
  mediaType: z.enum(['image/jpeg', 'image/png', 'application/pdf']),
  name: z.string().min(1).max(100),
  url: z.string().url(),
});

const partSchema = z.union([textPartSchema, filePartSchema]);

export const postRequestBodySchema = z.object({
  id: z.string().uuid(),
  message: z.object({
    id: z.string().uuid(),
    role: z.enum(['user']),
    parts: z.array(partSchema),
  }),
  selectedChatModel: z.enum([
    'chat-model',
    'chat-model-reasoning',
    'title-model',
    'artifact-model',
    'xai-grok-4',
    'xai-grok-3',
    'xai-grok-3-mini',
    'xai-image',
    'openai-gpt-4.1',
    'openai-gpt-4.1-mini',
    'openai-gpt-4.1-nano',
    'openai-gpt-image-1',
  ]),
  selectedVisibilityType: z.enum(['public', 'private']),
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;
