import { describe, expect, it } from 'vitest';

import type { OpenRouterMessage, OpenRouterTool } from '../../shared/types/types';
import { CodexResponsesTransport, type CodexTokenProvider } from './codexTransport';
import { CODEX_RESPONSES_URL } from './modelDefaults';
import { getModelRequestErrorInfo } from './modelErrors';
import type { FetchLike } from './modelTransport';

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
      'priority'
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

  it('parses completed output items and legacy token names', async () => {
    const fetch = captureTextFetch(
      [],
      sseData({
        type: 'response.completed',
        response: {
          output: [
            { type: 'reasoning', summary: [{ text: 'because' }] },
            { type: 'message', content: [{ type: 'output_text', text: 'done' }] },
            { type: 'function_call', call_id: 'call-2', name: 'write_file', arguments: '{"path":"a"}' }
          ],
          usage: { prompt_tokens: 3, completion_tokens: 4, total_tokens: 7 }
        }
      }) + '\n\n',
      'text/event-stream'
    );
    const transport = new CodexResponsesTransport({ tokenProvider: createTokenProvider(), fetch });

    const response = await transport.chat([{ role: 'user', content: 'hello' }]);

    expect(response).toMatchObject({
      role: 'assistant',
      content: 'done',
      reasoning: 'because',
      tool_calls: [{ id: 'call-2', type: 'function', function: { name: 'write_file', arguments: '{"path":"a"}' } }],
      usage: { promptTokens: 3, completionTokens: 4, totalTokens: 7 }
    });
  });

  it('throws structured serializable request errors', async () => {
    const fetch = captureTextFetch([], 'invalid auth', 'text/plain', 401, 'Unauthorized');
    const transport = new CodexResponsesTransport({ tokenProvider: createTokenProvider(), fetch });

    try {
      await transport.chat([{ role: 'user', content: 'hello' }], undefined, 'codex:gpt-5.1-codex');
      throw new Error('Expected request to fail.');
    } catch (error) {
      const info = getModelRequestErrorInfo(error);
      expect(info).toMatchObject({
        provider: 'codex',
        model: 'gpt-5.1-codex',
        endpoint: CODEX_RESPONSES_URL,
        method: 'POST',
        status: 401,
        statusText: 'Unauthorized',
        responseBody: 'invalid auth'
      });
      expect(JSON.parse(JSON.stringify(error))).toMatchObject({
        name: 'ModelRequestError',
        provider: 'codex',
        status: 401,
        responseBody: 'invalid auth'
      });
    }
  });
});

type CapturedRequest = {
  input: RequestInfo | URL;
  init?: RequestInit;
};

function createTokenProvider(): CodexTokenProvider {
  return {
    async getToken() {
      return {
        accessToken: 'access-token',
        accountId: 'account-1'
      };
    }
  };
}

function captureTextFetch(
  requests: CapturedRequest[],
  body: string,
  contentType: string,
  status = 200,
  statusText = 'OK'
): FetchLike {
  return async (input, init) => {
    requests.push({ input, init });
    return new Response(body, {
      status,
      statusText,
      headers: { 'Content-Type': contentType }
    });
  };
}

function readJsonBody(init: RequestInit | undefined): unknown {
  return JSON.parse(String(init?.body));
}

function sseData(data: unknown): string {
  return `data: ${JSON.stringify(data)}`;
}

function createTool(): OpenRouterTool {
  return {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read a file',
      parameters: { type: 'object', properties: { path: { type: 'string' } } }
    }
  };
}
