import { type NextRequest, NextResponse } from 'next/server';
import { log } from 'node:console';

/**
 * Escape text for safe inclusion in JSON strings
 */
function escapeJsonString(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/\f/g, '\\f');
}

/**
 * Handle streaming response from OpenAI Mock API
 */
function handleStreamingResponse(body: any) {
  const responseId = 'resp_6881205cd8b8819bb91e93e722b43c170bec1c06b7a52847';
  const messageId = 'msg_6881205d1a0c819b977d6fee7f7a883b0bec1c06b7a52847';
  const createdAt = Math.floor(Date.now() / 1000);

  // Extract user input text - find the LAST user message in conversation
  let userText = '';
  if (body.input && Array.isArray(body.input)) {
    // Find all user inputs and get the last one
    const userInputs = body.input.filter((input: any) => input.role === 'user');
    const lastUserInput = userInputs[userInputs.length - 1];

    if (lastUserInput && Array.isArray(lastUserInput.content)) {
      const textContent = lastUserInput.content.find(
        (content: any) => content.type === 'input_text',
      );
      if (textContent?.text) {
        userText = textContent.text;
        log('=== DEBUG USER TEXT ===');
        log('Raw userText:', JSON.stringify(userText));
        log('UserText length:', userText.length);
        log(
          'UserText char codes:',
          Array.from(userText).map((c) => c.charCodeAt(0)),
        );
        log('Total user inputs found:', userInputs.length);
        log('========================');
      }
    }
  }

  const responseText = `[Test API] Thanks for sending to me: '${userText}'`;

  // Generate streaming deltas for the response text
  function generateStreamingDeltas(text: string) {
    const words = text.split(' ');
    let deltas = '';
    let sequenceNumber = 4;

    words.forEach((word, index) => {
      const delta = index === 0 ? word : ` ${word}`;
      const escapedDelta = escapeJsonString(delta);
      deltas += `event: response.output_text.delta
data: {"type":"response.output_text.delta","sequence_number":${sequenceNumber},"item_id":"${messageId}","output_index":0,"content_index":0,"delta":"${escapedDelta}","logprobs":[]}

`;
      sequenceNumber++;
    });

    return { deltas, finalSequenceNumber: sequenceNumber };
  }

  const { deltas, finalSequenceNumber } = generateStreamingDeltas(responseText);
  const escapedResponseText = escapeJsonString(responseText);

  const streamingBody = `event: response.created
data: {"type":"response.created","sequence_number":0,"response":{"id":"${responseId}","object":"response","created_at":${createdAt},"status":"in_progress","background":false,"error":null,"incomplete_details":null,"instructions":null,"max_output_tokens":null,"max_tool_calls":null,"model":"gpt-4.1-nano-2025-04-14","output":[],"parallel_tool_calls":true,"previous_response_id":null,"prompt_cache_key":null,"reasoning":{"effort":null,"summary":null},"safety_identifier":null,"service_tier":"auto","store":true,"temperature":1.0,"text":{"format":{"type":"text"}},"tool_choice":"auto","tools":[],"top_logprobs":0,"top_p":1.0,"truncation":"disabled","usage":null,"user":null,"metadata":{}}}

event: response.in_progress
data: {"type":"response.in_progress","sequence_number":1,"response":{"id":"${responseId}","object":"response","created_at":${createdAt},"status":"in_progress","background":false,"error":null,"incomplete_details":null,"instructions":null,"max_output_tokens":null,"max_tool_calls":null,"model":"gpt-4.1-nano-2025-04-14","output":[],"parallel_tool_calls":true,"previous_response_id":null,"prompt_cache_key":null,"reasoning":{"effort":null,"summary":null},"safety_identifier":null,"service_tier":"auto","store":true,"temperature":1.0,"text":{"format":{"type":"text"}},"tool_choice":"auto","tools":[],"top_logprobs":0,"top_p":1.0,"truncation":"disabled","usage":null,"user":null,"metadata":{}}}

event: response.output_item.added
data: {"type":"response.output_item.added","sequence_number":2,"output_index":0,"item":{"id":"${messageId}","type":"message","status":"in_progress","content":[],"role":"assistant"}}

event: response.content_part.added
data: {"type":"response.content_part.added","sequence_number":3,"item_id":"${messageId}","output_index":0,"content_index":0,"part":{"type":"output_text","annotations":[],"logprobs":[],"text":""}}

${deltas}event: response.output_text.done
data: {"type":"response.output_text.done","sequence_number":${finalSequenceNumber},"item_id":"${messageId}","output_index":0,"content_index":0,"text":"${escapedResponseText}","logprobs":[]}

event: response.content_part.done
data: {"type":"response.content_part.done","sequence_number":${finalSequenceNumber + 1},"item_id":"${messageId}","output_index":0,"content_index":0,"part":{"type":"output_text","annotations":[],"logprobs":[],"text":"${escapedResponseText}"}}

event: response.output_item.done
data: {"type":"response.output_item.done","sequence_number":${finalSequenceNumber + 2},"output_index":0,"item":{"id":"${messageId}","type":"message","status":"completed","content":[{"type":"output_text","annotations":[],"logprobs":[],"text":"${escapedResponseText}"}],"role":"assistant"}}

event: response.completed
data: {"type":"response.completed","sequence_number":${finalSequenceNumber + 3},"response":{"id":"${responseId}","object":"response","created_at":${createdAt},"status":"completed","background":false,"error":null,"incomplete_details":null,"instructions":null,"max_output_tokens":null,"max_tool_calls":null,"model":"gpt-4.1-nano-2025-04-14","output":[{"id":"${messageId}","type":"message","status":"completed","content":[{"type":"output_text","annotations":[],"logprobs":[],"text":"${escapedResponseText}"}],"role":"assistant"}],"parallel_tool_calls":true,"previous_response_id":null,"prompt_cache_key":null,"reasoning":{"effort":null,"summary":null},"safety_identifier":null,"service_tier":"default","store":true,"temperature":1.0,"text":{"format":{"type":"text"}},"tool_choice":"auto","tools":[],"top_logprobs":0,"top_p":1.0,"truncation":"disabled","usage":{"input_tokens":406,"input_tokens_details":{"cached_tokens":0},"output_tokens":10,"output_tokens_details":{"reasoning_tokens":0},"total_tokens":416},"user":null,"metadata":{}}}

`;

  const headers = new Headers({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'x-request-id': 'req_a8f4b06fe336b513810e575ac0abb065',
    'openai-organization': 'schminkel',
    'CF-RAY': '963d01e37c291ce4-FRA',
    Server: 'cloudflare',
    'X-Content-Type-Options': 'nosniff',
    'cf-cache-status': 'DYNAMIC',
    'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
    Date: new Date().toUTCString(),
    'openai-processing-ms': '44',
    'openai-version': '2020-10-01',
    'alt-svc': 'h3=":443"; ma=86400',
    'openai-project': 'proj_iqPsE9i2rlqpnXFkTqyEMgkR',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  return new Response(streamingBody, {
    status: 200,
    headers,
  });
}

/**
 * Debug function to log request body details
 */
function debugRequestBody(body: any) {
  log('=== DEBUG REQUEST BODY ===');
  log('Body:', JSON.stringify(body, null, 2));
  log('Content:', body.input?.[0]?.content);

  // Enhanced debugging for user messages
  if (body.input && Array.isArray(body.input)) {
    body.input.forEach((input: any, index: number) => {
      log(`Input[${index}]:`, JSON.stringify(input, null, 2));
      if (input.role === 'user' && Array.isArray(input.content)) {
        input.content.forEach((contentItem: any, contentIndex: number) => {
          log(
            `  Content[${contentIndex}]:`,
            JSON.stringify(contentItem, null, 2),
          );
        });
      }
    });
  }
  log('===========================');
}

/**
 * Handle POST requests to the OpenAI Mock API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    //debugRequestBody(body);

    // Check if the request matches the expected pattern
    const isMatchingRequest =
      body.model?.startsWith('gpt-4') &&
      Array.isArray(body.input) &&
      body.input.length > 0 &&
      body.input[0] &&
      body.input[0].role === 'system';

    if (!isMatchingRequest) {
      log('=== DEBUG REQUEST VALIDATION FAILURE ===');
      log('Body:', body);
      log('==========================================');

      return NextResponse.json(
        { error: 'Request does not match expected pattern' },
        { status: 400 },
      );
    }

    // Check if this is a streaming request
    if (body.stream === true) {
      return handleStreamingResponse(body);
    }

    // Extract user input text for non-streaming response - find the LAST user message
    let userText = '';
    if (body.input && Array.isArray(body.input)) {
      // Find all user inputs and get the last one
      const userInputs = body.input.filter(
        (input: any) => input.role === 'user',
      );
      const lastUserInput = userInputs[userInputs.length - 1];

      if (lastUserInput && Array.isArray(lastUserInput.content)) {
        const textContent = lastUserInput.content.find(
          (content: any) => content.type === 'input_text',
        );
        if (textContent?.text) {
          // Try to parse JSON if it looks like a JSON string
          try {
            const parsed = JSON.parse(textContent.text);
            if (
              parsed.parts &&
              Array.isArray(parsed.parts) &&
              parsed.parts[0]?.text
            ) {
              userText = parsed.parts[0].text.substring(0, 30);
            } else {
              userText = textContent.text.substring(0, 30);
            }
          } catch {
            // If not JSON, just use the text directly
            userText = textContent.text.substring(0, 30);
          }
        }
      }
    }

    const responseText = `🧪 [Test API] ${userText.substring(0, 30)}...`;

    // Mock response data
    const mockResponse = {
      id: 'resp_6881205bafd48199992712afc993baa70c64e8b672b6beeb',
      object: 'response',
      created_at: 1753292891,
      status: 'completed',
      background: false,
      error: null,
      incomplete_details: null,
      instructions: null,
      max_output_tokens: null,
      max_tool_calls: null,
      model: body.model,
      output: [
        {
          id: 'msg_6881205c325c8199a640585531f060a30c64e8b672b6beeb',
          type: 'message',
          status: 'completed',
          content: [
            {
              type: 'output_text',
              annotations: [],
              logprobs: [],
              text: responseText,
            },
          ],
          role: 'assistant',
        },
      ],
      parallel_tool_calls: true,
      previous_response_id: null,
      prompt_cache_key: null,
      reasoning: {
        effort: null,
        summary: null,
      },
      safety_identifier: null,
      service_tier: 'default',
      store: true,
      temperature: 1.0,
      text: {
        format: {
          type: 'text',
        },
      },
      tool_choice: 'auto',
      tools: [],
      top_logprobs: 0,
      top_p: 1.0,
      truncation: 'disabled',
      usage: {
        input_tokens: 176,
        input_tokens_details: {
          cached_tokens: 0,
        },
        output_tokens: 5,
        output_tokens_details: {
          reasoning_tokens: 0,
        },
        total_tokens: 181,
      },
      user: null,
      metadata: {},
    };

    // Mock headers
    const headers = new Headers({
      'Content-Type': 'application/json',
      'x-request-id': 'req_245b8a3fc84e6d17f6cf2762b0713205',
      'x-ratelimit-limit-tokens': '200000',
      'openai-organization': 'schminkel',
      'CF-RAY': '963d01dc4ff51d8c-FRA',
      Server: 'cloudflare',
      'X-Content-Type-Options': 'nosniff',
      'x-ratelimit-reset-requests': '120ms',
      'x-ratelimit-remaining-tokens': '199805',
      'cf-cache-status': 'DYNAMIC',
      'x-ratelimit-remaining-requests': '499',
      'strict-transport-security':
        'max-age=31536000; includeSubDomains; preload',
      Date: new Date().toUTCString(),
      'x-ratelimit-reset-tokens': '58ms',
      'x-ratelimit-limit-requests': '500',
      'openai-processing-ms': '682',
      'openai-version': '2020-10-01',
      'alt-svc': 'h3=":443"; ma=86400',
      'openai-project': 'proj_iqPsE9i2rlqpnXFkTqyEMgkR',
    });

    return NextResponse.json(mockResponse, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Invalid JSON in request body' },
      { status: 400 },
    );
  }
}
