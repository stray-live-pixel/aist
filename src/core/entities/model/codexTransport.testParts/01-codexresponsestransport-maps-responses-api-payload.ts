import { describe, expect, it } from 'vitest';

import type { OpenRouterMessage, OpenRouterTool } from '../../../shared/types/types';
import { CodexResponsesTransport, type CodexTokenProvider } from '../codexTransport';
import { CODEX_RESPONSES_URL } from '../modelDefaults';
import { getModelRequestErrorInfo } from '../modelErrors';
import { MODEL_REQUEST_TIMEOUT_MS } from '../modelRequestTimeout';
import type { FetchLike } from '../modelTransport';
import { CapturedRequest, captureTextFetch, createTokenProvider, createTool, readJsonBody, sseData } from './helpers';

describe('CodexResponsesTransport', () => {
  it('maps Responses API payload, headers, streaming callbacks, and usage', async () => {
    const requests: CapturedRequest[] = [];
    const fetch = captureTextFetch(
      requests,
      [
        sseData({ type: 'response.output_text.delta', delta: 'hel' }),
        sseData({ type: 'response.output_text.delta', delta: 'lo' }),
        sseData({ type: 'response.output_text.done', text: 'hello' }),
        sseData({
          type: 'response.completed',
          response: {
            usage: { input_tokens: 13, output_tokens: 5, total_tokens: 18 }
          }
        })
      ].join('\n\n') + '\n\n',
      'text/event-stream'
    );
    const contentDeltas: string[] = [];
    const responseHeaders: unknown[] = [];
    let completed = false;
    const transport = new CodexResponsesTransport({
      tokenProvider: createTokenProvider(),
      fetch,
      sessionId: 'session-1',
      userAgent: 'aist-test-agent'
    });
    const messages: OpenRouterMessage[] = [
      { role: 'system', content: 'System one.' },
      { role: 'system', content: 'System two.' },
      { role: 'user', content: 'Write code.' },
      {
        role: 'assistant',
        content: 'Calling tool.',
        tool_calls: [
          {
            id: 'call-1',
            type: 'function',
            function: { name: 'read_file', arguments: { path: 'src/index.ts' } }
          }
        ]
      },
      { role: 'tool', tool_call_id: 'call-1', content: '{"ok":true}' }
    ];
    const tool = createTool();

    const response = await transport.chat(
      messages,
      [tool],
      'codex:gpt-5.1-codex',
      undefined,
      {
        onContentDelta: (delta) => contentDeltas.push(delta),
        onComplete: () => {
          completed = true;
        }
      },
      {
        onResponseHeaders: (info) => responseHeaders.push(info)
      },
      { codexServiceTier: 'priority' }
    );

    expect(response).toMatchObject({
      role: 'assistant',
      content: 'hello',
      usage: { promptTokens: 13, completionTokens: 5, totalTokens: 18 }
    });
    expect(responseHeaders).toEqual([{ status: 200, statusText: 'OK' }]);
    expect(contentDeltas).toEqual(['hel', 'lo']);
    expect(completed).toBe(true);
    expect(requests[0].input).toBe(CODEX_RESPONSES_URL);
    expect(requests[0].init?.headers).toMatchObject({
      authorization: 'Bearer access-token',
      originator: 'opencode',
      'User-Agent': 'aist-test-agent',
      session_id: 'session-1',
      'ChatGPT-Account-Id': 'account-1'
    });
    const initWithDispatcher = requests[0].init as RequestInit & { dispatcher?: Record<symbol, unknown> };
    const dispatcherOptions = Object.getOwnPropertySymbols(initWithDispatcher.dispatcher || {})
      .map((symbol) => initWithDispatcher.dispatcher?.[symbol])
      .find((value) => typeof value === 'object' && value !== null && 'bodyTimeout' in value);
    expect(dispatcherOptions).toMatchObject({
      bodyTimeout: MODEL_REQUEST_TIMEOUT_MS,
      headersTimeout: MODEL_REQUEST_TIMEOUT_MS
    });
    expect(readJsonBody(requests[0].init)).toEqual({
      model: 'gpt-5.1-codex',
      store: false,
      stream: true,
      service_tier: 'priority',
      instructions: 'System one.\n\nSystem two.',
      input: [
        { role: 'user', content: 'Write code.' },
        { role: 'assistant', content: 'Calling tool.' },
        {
          type: 'function_call',
          call_id: 'call-1',
          name: 'read_file',
          arguments: '{"path":"src/index.ts"}'
        },
        { type: 'function_call_output', call_id: 'call-1', output: '{"ok":true}' }
      ],
      tools: [
        {
          type: 'function',
          name: 'read_file',
          description: 'Read a file',
          parameters: { type: 'object', properties: { path: { type: 'string' } } }
        }
      ],
      tool_choice: 'auto'
    });
  });
});
