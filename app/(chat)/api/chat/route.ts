import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
} from 'ai';
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
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { isProductionEnvironment } from '@/lib/constants';
import { myProvider } from '@/lib/ai/providers';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import { postRequestBodySchema, type PostRequestBody } from './schema';
import { geolocation } from '@vercel/functions';
import { S3_CONFIG } from '@/lib/s3-config';
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

// Helper function to extract S3 key from URL
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
      if (urlObj.hostname.includes('s3.') && !urlObj.hostname.startsWith('s3.')) {
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

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    log('### Invalid request body:', _);
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

    if (!chat) {
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

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: id });

    log('### Stream ID created:', streamId);

    const stream = createUIMessageStream({
      execute: async ({ writer: dataStream }) => {
        // Preprocess messages to convert S3 URLs to presigned URLs for AI model access
        const processedMessages = await preprocessMessagesForAI(uiMessages);

        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt({ selectedChatModel, requestHints }),
          messages: convertToModelMessages(processedMessages),
          stopWhen: stepCountIs(5),
          experimental_activeTools:
            selectedChatModel === 'chat-model-reasoning'
              ? []
              : [
                  'getWeather',
                  'createDocument',
                  'updateDocument',
                  'requestSuggestions',
                ],
          experimental_transform: smoothStream({ chunking: 'word' }),
          tools: {
            getWeather,
            createDocument: createDocument({ session, dataStream }),
            updateDocument: updateDocument({ session, dataStream }),
            requestSuggestions: requestSuggestions({
              session,
              dataStream,
            }),
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: 'stream-text',
          },
        });

        result.consumeStream();

        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning: true,
          }),
        );
      },
      generateId: generateUUID,

      onFinish: async ({ messages }) => {
        log('### Stream finished, saving messages:', messages.length);
        await saveMessages({
          messages: messages.map((message) => ({
            id: message.id,
            role: message.role,
            parts: message.parts,
            createdAt: new Date(),
            attachments: [],
            chatId: id,
          })),
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
      );
    } else {
      return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
    }
  } catch (error) {
    log('### Error in POST handler:', error);
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    } else {
      return Response.json(
        { error: error },
        { status: 500 },
      );
    }
  }
}

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

  if (chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}

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

  if (chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  try {
    const { title } = await request.json();

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return new ChatSDKError('bad_request:api', 'Title is required').toResponse();
    }

    if (title.length > 100) {
      return new ChatSDKError('bad_request:api', 'Title is too long').toResponse();
    }

    await updateChatTitleById({ chatId: id, title: title.trim() });

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new ChatSDKError('bad_request:api', 'Failed to update chat title').toResponse();
  }
}
