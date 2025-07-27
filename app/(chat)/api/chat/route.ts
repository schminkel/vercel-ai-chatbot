import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
  experimental_generateImage,
} from 'ai';
import OpenAI, { toFile } from 'openai';
import { auth, type UserType } from '@/app/(auth)/auth';
import { type RequestHints, systemPrompt } from '@/lib/ai/prompts';
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  updateChatTitleById,
} from '@/lib/db/queries';
import { convertToUIMessages, generateUUID } from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
import { isProductionEnvironment } from '@/lib/constants';
import { myProvider } from '@/lib/ai/providers';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import { postRequestBodySchema, type PostRequestBody } from './schema';
import { geolocation } from '@vercel/functions';
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from 'resumable-stream';
import { after } from 'next/server';
import { ChatSDKError } from '@/lib/errors';
import type { ChatMessage } from '@/lib/types';
import type { ChatModel } from '@/lib/ai/models';
import type { VisibilityType } from '@/components/visibility-selector';
import { log } from 'node:console';
import { preprocessMessagesForAI } from '@/lib/message-preprocessor';

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

/**
 * Function to get or create a global resumable stream context
 */
export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes('REDIS_URL')) {
        console.log(
          ' > Resumable streams are disabled due to missing REDIS_URL',
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

/**
 * Helper function to extract S3 key from URL
 */
function extractS3KeyFromUrl(url: string): string | undefined {
  try {
    const urlObj = new URL(url);
    console.log(`Extracting S3 key from URL: ${url}`);
    console.log(`Hostname: ${urlObj.hostname}, Pathname: ${urlObj.pathname}`);

    // Check if it's an S3 URL (various formats)
    if (
      urlObj.hostname.includes('amazonaws.com') ||
      urlObj.hostname.includes('s3') ||
      urlObj.hostname.endsWith('.s3.amazonaws.com')
    ) {
      // For URLs like: https://bucket.s3.region.amazonaws.com/key
      // or https://s3.region.amazonaws.com/bucket/key
      let key = urlObj.pathname.substring(1); // Remove leading slash

      // Handle different S3 URL formats
      if (
        urlObj.hostname.includes('s3.') &&
        !urlObj.hostname.startsWith('s3.')
      ) {
        // Format: https://bucket.s3.region.amazonaws.com/key
        key = urlObj.pathname.substring(1);
      } else if (urlObj.hostname.startsWith('s3.')) {
        // Format: https://s3.region.amazonaws.com/bucket/key
        const pathParts = urlObj.pathname.substring(1).split('/');
        if (pathParts.length > 1) {
          key = pathParts.slice(1).join('/'); // Remove bucket name, keep the rest
        }
      }

      // Decode URL-encoded characters (spaces, special chars)
      key = decodeURIComponent(key);

      console.log(`Extracted S3 key: ${key}`);
      return key;
    }

    console.log('URL is not an S3 URL');
  } catch (error) {
    console.error('Error parsing URL:', error);
  }
  return undefined;
}

/**
 * Handles image generation for image models (xai-image)
 */
async function handleImageGeneration(
  message: ChatMessage,
  actualModelUsed: string,
  streamTimestamp: Date,
  streamId: string,
  id: string,
): Promise<Response> {
  try {
    // Preprocess message to convert S3 URLs to presigned URLs for LLM access
    const [processedMessage] = await preprocessMessagesForAI([message]);

    // Gather all text parts and concatenate them for the prompt
    const textParts = processedMessage.parts
      .filter((p) => p.type === 'text' && 'text' in p)
      .map((p: any) => p.text);
    const prompt = textParts.join('\n').trim();
    if (!prompt) {
      return new ChatSDKError(
        'bad_request:api',
        'No text prompt found for image generation',
      ).toResponse();
    }

    // Gather all image/file parts (attachments) with accessible URLs
    const imageParts = processedMessage.parts.filter(
      (p) =>
        p.type === 'file' && p.mediaType && p.mediaType.startsWith('image/'),
    );
    // Collect URLs of attached images (now accessible)
    const imageUrls = imageParts.map((p: any) => p.url);

    // Log all information provided to the model
    log('### handleImageGeneration: prompt sent to model:', prompt);
    log('### handleImageGeneration: image URLs sent to model:', imageUrls);

    // Pass both prompt and images to the image generation function if supported
    // (Assume the provider supports an 'images' or 'imageUrls' parameter; adjust as needed)
    const { image } = await experimental_generateImage({
      model: myProvider.imageModel(actualModelUsed),
      prompt,
      n: 1,
      ...(imageUrls.length > 0 ? { images: imageUrls } : {}),
    });

    // Define the usage data for image generation
    const usageData = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      imagesGenerated: 1,
    };

    // Compose the assistant message with the image (base64), model info, and usage data
    const assistantMessage = {
      id: generateUUID(),
      role: 'assistant' as const,
      parts: [
        {
          type: 'file' as const,
          mediaType: 'image/png',
          name: 'generated-image.png',
          url: `data:image/png;base64,${image.base64}`,
        },
        {
          type: 'data' as const,
          data: {
            modelId: actualModelUsed,
            timestamp: streamTimestamp.toISOString(),
            usage: usageData,
          },
        },
      ],
      createdAt: new Date(),
      attachments: [],
      chatId: id,
    };

    // Save the assistant message to database
    await saveMessages({ messages: [assistantMessage] });

    // Use the SDK's stream creation approach for consistency with text streams
    const { createUIMessageStream, JsonToSseTransformStream } = await import(
      'ai'
    );
    const stream = createUIMessageStream({
      execute: async ({ writer: dataStream }) => {
        // Add the message to the response
        dataStream.write({
          type: 'start',
          messageId: assistantMessage.id,
        });

        // For each part in the message, write appropriate stream parts
        for (const part of assistantMessage.parts) {
          if (part.type === 'file') {
            dataStream.write({
              type: 'file',
              url: part.url,
              mediaType: part.mediaType,
            });
          }
        }

        // Send model information as custom data
        dataStream.write({
          type: 'data-modelInfo',
          data: JSON.stringify({
            modelId: actualModelUsed,
            timestamp: streamTimestamp.toISOString(),
          }),
        });

        // Send usage information for image generation
        dataStream.write({
          type: 'data-usage',
          data: JSON.stringify({
            usage: usageData,
          }),
        });

        // Add finish to complete the message
        dataStream.write({
          type: 'finish',
        });
      },
      generateId: () => assistantMessage.id,
      onFinish: () => {}, // Already saved above
    });

    const streamContext = getStreamContext();

    if (streamContext) {
      return new Response(
        await streamContext.resumableStream(streamId, () =>
          stream.pipeThrough(new JsonToSseTransformStream()),
        ),
        {
          headers: {
            'Content-Type': 'text/event-stream',
          },
        },
      );
    } else {
      return new Response(stream.pipeThrough(new JsonToSseTransformStream()), {
        headers: {
          'Content-Type': 'text/event-stream',
        },
      });
    }
  } catch (error) {
    log('### Error in image generation handler:', error);
    return new ChatSDKError(
      'bad_request:api',
      'Image generation failed',
    ).toResponse();
  }
}

/**
 * Handles image editing with GPT-image-1 for handling image edits or generating images
 */
async function handleImageEditsWithGptImage1(
  uiMessages: ChatMessage[],
  streamTimestamp: Date,
  streamId: string,
  id: string,
): Promise<Response> {
  try {
    // Initialize OpenAI client
    const openai = new OpenAI();

    // Extract the latest user message for the prompt
    const latestMessage = uiMessages[uiMessages.length - 1];
    if (latestMessage.role !== 'user') {
      return new ChatSDKError(
        'bad_request:api',
        'No user message found for image editing',
      ).toResponse();
    }

    // Preprocess message to convert S3 URLs to presigned URLs for OpenAI access
    const [processedMessage] = await preprocessMessagesForAI([latestMessage]);

    // Gather all text parts and concatenate them for the prompt
    const textParts = processedMessage.parts
      .filter((p) => p.type === 'text' && 'text' in p)
      .map((p: any) => p.text);
    const prompt = textParts.join('\n').trim();
    if (!prompt) {
      return new ChatSDKError(
        'bad_request:api',
        'No text prompt found for image editing',
      ).toResponse();
    }

    // Gather all image/file parts (attachments) with accessible URLs
    const imageParts = processedMessage.parts.filter(
      (p) =>
        p.type === 'file' && p.mediaType && p.mediaType.startsWith('image/'),
    );
    if (imageParts.length === 0) {
      return new ChatSDKError(
        'bad_request:api',
        'No images found for editing',
      ).toResponse();
    }

    // Convert URLs to File objects for OpenAI API
    const imageFiles = await Promise.all(
      imageParts.map(async (part: any) => {
        try {
          // Fetch the image from the URL
          const response = await fetch(part.url);
          if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
          }

          // Convert to ArrayBuffer and then to File object
          const arrayBuffer = await response.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);

          // Use OpenAI's toFile helper to create a File object
          return await toFile(uint8Array, part.name || 'image.png', {
            type: part.mediaType,
          });
        } catch (error) {
          log(`### Error processing image ${part.url}:`, error);
          throw new Error(`Failed to process image: ${part.url}`);
        }
      }),
    );

    // Log all information provided to the model
    log('### handleImageEditsWithGptImage1: prompt sent to model:', prompt);
    log(
      '### handleImageEditsWithGptImage1: number of images sent to model:',
      imageFiles.length,
    );

    // Call OpenAI images.edit API
    // Pass File objects according to API specification
    const response = await openai.images.edit({
      model: 'gpt-image-1',
      image: imageFiles,
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      quality: 'low',
      background: 'auto',
    });

    // Log the response to the console
    log('### OpenAI images.edit response:', response);

    if (!response.data || response.data.length === 0) {
      return new ChatSDKError(
        'bad_request:api',
        'No image generated from OpenAI',
      ).toResponse();
    }

    // Get the base64 image data
    const imageBase64 = response.data[0].b64_json;
    if (!imageBase64) {
      return new ChatSDKError(
        'bad_request:api',
        'No base64 image data returned',
      ).toResponse();
    }

    // Define the usage data for image editing
    // I am not using the OpenAI usage data here, as gpt-image-1 does costs always 1 image credit
    const usageData = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      imagesGenerated: 1,
    };

    // Compose the assistant message with the edited image (base64), model info, and usage data
    const assistantMessage = {
      id: generateUUID(),
      role: 'assistant' as const,
      parts: [
        {
          type: 'file' as const,
          mediaType: 'image/png',
          name: 'edited-image.png',
          url: `data:image/png;base64,${imageBase64}`,
        },
        {
          type: 'data' as const,
          data: {
            modelId: 'openai-gpt-image-1',
            timestamp: streamTimestamp.toISOString(),
            usage: usageData,
          },
        },
      ],
      createdAt: new Date(),
      attachments: [],
      chatId: id,
    };

    // Save the assistant message to database
    await saveMessages({ messages: [assistantMessage] });

    // Use the SDK's stream creation approach for consistency with text streams
    const { createUIMessageStream, JsonToSseTransformStream } = await import(
      'ai'
    );
    const stream = createUIMessageStream({
      execute: async ({ writer: dataStream }) => {
        // Add the message to the response
        dataStream.write({
          type: 'start',
          messageId: assistantMessage.id,
        });

        // For each part in the message, write appropriate stream parts
        for (const part of assistantMessage.parts) {
          if (part.type === 'file') {
            dataStream.write({
              type: 'file',
              url: part.url,
              mediaType: part.mediaType,
            });
          }
        }

        // Send model information as custom data
        dataStream.write({
          type: 'data-modelInfo',
          data: JSON.stringify({
            modelId: 'openai-gpt-image-1',
            timestamp: streamTimestamp.toISOString(),
          }),
        });

        // Send usage information for image editing
        dataStream.write({
          type: 'data-usage',
          data: JSON.stringify({
            usage: usageData,
          }),
        });

        // Add finish to complete the message
        dataStream.write({
          type: 'finish',
        });
      },
      generateId: () => assistantMessage.id,
      onFinish: () => {}, // Already saved above
    });

    const streamContext = getStreamContext();

    if (streamContext) {
      return new Response(
        await streamContext.resumableStream(streamId, () =>
          stream.pipeThrough(new JsonToSseTransformStream()),
        ),
        {
          headers: {
            'Content-Type': 'text/event-stream',
          },
        },
      );
    } else {
      return new Response(stream.pipeThrough(new JsonToSseTransformStream()), {
        headers: {
          'Content-Type': 'text/event-stream',
        },
      });
    }
  } catch (error) {
    log('### Error in image editing handler:', error);
    return new ChatSDKError(
      'bad_request:api',
      'Image editing failed',
    ).toResponse();
  }
}

/**
 * Handles text streaming for language models
 */
async function handleTextStreaming(
  uiMessages: ChatMessage[],
  actualModelUsed: string,
  streamTimestamp: Date,
  streamId: string,
  id: string,
  requestHints: RequestHints,
  session: any,
): Promise<Response> {
  // Track token usage at stream level
  let tokenUsage: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  } | null = null;

  const stream = createUIMessageStream({
    execute: async ({ writer: dataStream }) => {
      // Preprocess messages to convert S3 URLs to presigned URLs for AI model access
      const processedMessages = await preprocessMessagesForAI(uiMessages);

      const result = streamText({
        model: myProvider.languageModel(actualModelUsed),
        system: systemPrompt({
          selectedChatModel: actualModelUsed,
          requestHints,
        }),
        messages: convertToModelMessages(processedMessages),
        stopWhen: stepCountIs(5),
        experimental_activeTools: [
          // 'getWeather',
          // 'createDocument',
          // 'updateDocument',
          // 'requestSuggestions',
        ],
        experimental_transform: smoothStream({ chunking: 'word' }),
        tools: {
          // getWeather,
          // createDocument: createDocument({ session, dataStream }),
          // updateDocument: updateDocument({ session, dataStream }),
          // requestSuggestions: requestSuggestions({
          //   session,
          //   dataStream,
          // }),
        },
        experimental_telemetry: {
          isEnabled: isProductionEnvironment,
          functionId: 'stream-text',
        },
      });

      result.consumeStream();

      // Send model information as custom data
      dataStream.write({
        type: 'data-modelInfo',
        data: JSON.stringify({
          modelId: actualModelUsed,
          timestamp: streamTimestamp.toISOString(),
        }),
      });

      // Listen for usage data from the stream
      const uiStream = result.toUIMessageStream({
        sendReasoning: true,
      });

      // Capture usage data from the result when stream finishes
      result.usage
        .then((usage) => {
          if (usage) {
            tokenUsage = usage;
            // Send usage data as custom data
            dataStream.write({
              type: 'data-usage',
              data: JSON.stringify({
                modelId: actualModelUsed,
                timestamp: streamTimestamp.toISOString(),
                usage: tokenUsage,
              }),
            });
            log('### Token usage captured:', tokenUsage);
          } else {
            log('### No usage data available from result');
          }
        })
        .catch((error) => {
          log('### Error getting usage data:', error);
        });

      dataStream.merge(uiStream);
    },
    generateId: generateUUID,

    onFinish: async ({ messages }) => {
      log('### Stream finished, saving messages:', messages.length);
      log('### Actual model used for messages:', actualModelUsed);
      log('### Stream started at:', streamTimestamp);
      log('### Messages being saved with modelId:', actualModelUsed);
      log('### Token usage for saving:', tokenUsage);
      await saveMessages({
        messages: messages.map((message) => {
          // Add token usage to the parts of assistant messages
          const enhancedParts =
            message.role === 'assistant' && tokenUsage
              ? [
                  ...message.parts,
                  {
                    type: 'data' as const,
                    data: {
                      modelId: actualModelUsed,
                      timestamp: streamTimestamp.toISOString(),
                      usage: tokenUsage,
                    },
                  },
                ]
              : message.parts;
          return {
            id: message.id,
            role: message.role,
            parts: enhancedParts,
            createdAt: new Date(),
            attachments: [],
            chatId: id,
          };
        }),
      });
    },

    onError: () => {
      log('### Error occurred during streaming');
      return 'Oops, an error occurred!';
    },
  });

  const streamContext = getStreamContext();

  if (streamContext) {
    return new Response(
      await streamContext.resumableStream(streamId, () =>
        stream.pipeThrough(new JsonToSseTransformStream()),
      ),
      {
        headers: {
          'Content-Type': 'text/event-stream',
        },
      },
    );
  } else {
    return new Response(stream.pipeThrough(new JsonToSseTransformStream()), {
      headers: {
        'Content-Type': 'text/event-stream',
      },
    });
  }
}

/**
 * Validates and parses the request body for POST requests
 */
async function validateRequestBody(request: Request): Promise<PostRequestBody> {
  try {
    const json = await request.json();
    return postRequestBodySchema.parse(json);
  } catch (error) {
    log('### Invalid request body:', error);
    throw new ChatSDKError('bad_request:api');
  }
}

/**
 * Handles a POST request containing chat message and metadata
 */
export async function POST(request: Request) {
  log('### POST request received at /api/chat');

  // Add a pause to test the loading state
  // log('### Simulating loading state... 25000ms delay');
  // await new Promise((resolve) => setTimeout(resolve, 25000));
  // log('### Loading state complete, processing request...');

  let requestBody: PostRequestBody;

  try {
    requestBody = await validateRequestBody(request);
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new ChatSDKError('bad_request:api').toResponse();
  }

  try {
    const {
      id,
      message,
      selectedChatModel,
      selectedVisibilityType,
    }: {
      id: string;
      message: ChatMessage;
      selectedChatModel: ChatModel['id'];
      selectedVisibilityType: VisibilityType;
    } = requestBody;

    log('### Chat Model ID:', selectedChatModel);

    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const userType: UserType = session.user.type;

    log('### Authenticated user type:', userType);

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      return new ChatSDKError('rate_limit:chat').toResponse();
    }

    log('### Message count for user:', messageCount);

    const chat = await getChatById({ id });

    log('### Chat retrieved:', chat);

    if (!chat || chat.hidden) {
      const title = await generateTitleFromUserMessage({
        message,
      });

      log('### Generated title for new chat:', title);

      await saveChat({
        id,
        userId: session.user.id,
        title,
        visibility: selectedVisibilityType,
      });
    } else {
      if (chat.userId !== session.user.id) {
        log('### User does not own the chat:', chat.userId, session.user.id);
        return new ChatSDKError('forbidden:chat').toResponse();
      }
    }

    log('### Chat saved or updated:', id);

    const messagesFromDb = await getMessagesByChatId({ id });
    const uiMessages = [...convertToUIMessages(messagesFromDb), message];

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    log('### Geolocation data:', requestHints);

    // Extract attachments from message parts
    const attachments: Array<{
      name: string;
      url: string;
      contentType: string;
      s3Key?: string;
    }> = [];

    for (const part of message.parts) {
      if (part.type === 'file') {
        // Extract S3 key from URL if it's an S3 URL
        const s3Key = extractS3KeyFromUrl(part.url);
        attachments.push({
          name: (part as any).name, // Type assertion for schema-defined property
          url: part.url,
          contentType: part.mediaType,
          s3Key: s3Key,
        });
      }
    }

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: 'user',
          parts: message.parts,
          attachments,
          createdAt: new Date(),
        },
      ],
    });

    log('### User message saved:', message.id);

    // --- Model-specific handling ---
    const actualModelUsed = selectedChatModel;
    const streamTimestamp = new Date();
    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: id });
    log('### Stream ID created:', streamId);
    log('### Model locked in for this stream:', actualModelUsed);

    // Route to appropriate handler based on model type
    if (actualModelUsed === 'xai-image') {
      return await handleImageGeneration(
        message, // pass in the current message only, not the entire chat with all messages
        actualModelUsed,
        streamTimestamp,
        streamId,
        id,
      );
    } else if (actualModelUsed === 'openai-gpt-image-1') {
      return await handleImageEditsWithGptImage1(
        uiMessages, // pass in all UI messages for context
        streamTimestamp,
        streamId,
        id,
      );
    } else {
      return await handleTextStreaming(
        uiMessages, // pass in the UI messages including the new user message and all previous messages
        actualModelUsed,
        streamTimestamp,
        streamId,
        id,
        requestHints,
        session,
      );
    }
  } catch (error) {
    log('### Error in POST handler:', error);
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    } else {
      return Response.json({ error: error }, { status: 500 });
    }
  }
}

/**
 * Handles DELETE request to delete a chat by ID
 */
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const chat = await getChatById({ id });

  if (!chat) {
    return new ChatSDKError('not_found:chat').toResponse();
  }

  if (chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}

/**
 * Handles PATCH request to update a chat title by ID
 */
export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const chat = await getChatById({ id });

  if (!chat) {
    return new ChatSDKError('not_found:chat').toResponse();
  }

  if (chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  try {
    const { title } = await request.json();

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return new ChatSDKError(
        'bad_request:api',
        'Title is required',
      ).toResponse();
    }

    if (title.length > 100) {
      return new ChatSDKError(
        'bad_request:api',
        'Title is too long',
      ).toResponse();
    }

    await updateChatTitleById({ chatId: id, title: title.trim() });

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new ChatSDKError(
      'bad_request:api',
      'Failed to update chat title',
    ).toResponse();
  }
}
