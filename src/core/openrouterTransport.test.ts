import { describe, expect, it } from 'vitest';

import { OPENROUTER_MODELS_URL, OPENROUTER_URL } from './modelDefaults';
import { getModelRequestErrorInfo } from './modelErrors';
import type { FetchLike } from './modelTransport';
import { OpenRouterTransport } from './openrouterTransport';
import type { OpenRouterTool } from './types';

describe('OpenRouterTransport', () => {
  it('maps chat payload, headers, and non-stream usage without reading external config', async () => {
    const requests: CapturedRequest[] = [];
    const fetch = captureFetch(requests, {
      choices: [{ message: { role: 'assistant', content: 'done' } }],
      usage: { prompt_tokens: 11, completion_tokens: 7, total_tokens: 18 }
    });
    const tool = createTool();
    const transport = new OpenRouterTransport({
      apiKey: 'sk-test',
      model: 'default-model',
      siteUrl: 'https://aist.example',
      siteName: 'aist test',
      reasoningEffort: 'high',
      fetch
    });
    const responseHeaders: unknown[] = [];

    const response = await transport.chat(
      [{ role: 'user', content: 'hello' }],
      [tool],
      'override-model',
      undefined,
      undefined,
      {
        onResponseHeaders: (info) => responseHeaders.push(info)
      }
    );

    expect(response).toMatchObject({
      role: 'assistant',
      content: 'done',
      usage: { promptTokens: 11, completionTokens: 7, totalTokens: 18 }
    });
    expect(responseHeaders).toEqual([{ status: 200, statusText: 'OK' }]);
    expect(requests[0].input).toBe(OPENROUTER_URL);
    expect(requests[0].init?.method).toBe('POST');
    expect(requests[0].init?.headers).toMatchObject({
      Authorization: 'Bearer sk-test',
      'HTTP-Referer': 'https://aist.example',
      'X-Title': 'aist test'
    });
    expect(readJsonBody(requests[0].init)).toEqual({
      model: 'override-model',
      messages: [{ role: 'user', content: 'hello' }],
      tools: [tool],
      tool_choice: 'auto',
      reasoning: { effort: 'high' },
      temperature: 0.2
    });
  });

  it('keeps streaming callbacks and maps stream usage', async () => {
    const requests: CapturedRequest[] = [];
    const fetch = captureTextFetch(
      requests,
      [
        sseData({ choices: [{ delta: { reasoning: 'thinking ' } }] }),
        sseData({ choices: [{ delta: { content: 'hel' } }] }),
        sseData({
          choices: [{ delta: { content: 'lo' } }],
          usage: { prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 }
        }),
        'data: [DONE]'
      ].join('\n\n') + '\n\n',
      'text/event-stream'
    );
    const contentDeltas: string[] = [];
    const reasoningDeltas: string[] = [];
    let completed = false;
    const transport = new OpenRouterTransport({ apiKey: 'sk-test', fetch });

    const response = await transport.chat([{ role: 'user', content: 'hello' }], undefined, undefined, undefined, {
      onContentDelta: (delta) => contentDeltas.push(delta),
      onReasoningDelta: (delta) => reasoningDeltas.push(delta),
      onComplete: () => {
        completed = true;
      }
    });

    expect(readJsonBody(requests[0].init)).toMatchObject({
      stream: true,
      stream_options: { include_usage: true }
    });
    expect(contentDeltas).toEqual(['hel', 'lo']);
    expect(reasoningDeltas).toEqual(['thinking ']);
    expect(completed).toBe(true);
    expect(response).toMatchObject({
      role: 'assistant',
      content: 'hello',
      reasoning: 'thinking ',
      usage: { promptTokens: 3, completionTokens: 2, totalTokens: 5 }
    });
  });

  it('maps model catalog responses', async () => {
    const requests: CapturedRequest[] = [];
    const fetch = captureFetch(requests, {
      data: [
        {
          id: 'z/model',
          name: 'Zed',
          context_length: 128000,
          pricing: { prompt: '0.000001', completion: '0.000002' },
          supported_parameters: ['tools']
        },
        { id: 'a/model', name: 'Alpha', supported_parameters: [] },
        { name: 'missing id' }
      ]
    });
    const transport = new OpenRouterTransport({ apiKey: 'sk-test', fetch });

    const models = await transport.listModels();

    expect(requests[0].input).toBe(`${OPENROUTER_MODELS_URL}?output_modalities=text`);
    expect(models).toEqual([
      {
        id: 'a/model',
        name: 'Alpha',
        provider: 'openrouter',
        contextLength: undefined,
        pricing: undefined,
        supportsTools: false
      },
      {
        id: 'z/model',
        name: 'Zed',
        provider: 'openrouter',
        contextLength: 128000,
        pricing: { prompt: 0.000001, completion: 0.000002 },
        supportsTools: true
      }
    ]);
  });

  it('throws structured serializable request errors', async () => {
    const fetch = captureTextFetch([], 'upstream unavailable', 'text/plain', 502, 'Bad Gateway');
    const transport = new OpenRouterTransport({ apiKey: 'sk-test', fetch });

    try {
      await transport.chat([{ role: 'user', content: 'hello' }], undefined, 'openai/test');
      throw new Error('Expected request to fail.');
    } catch (error) {
      const info = getModelRequestErrorInfo(error);
      expect(info).toMatchObject({
        provider: 'openrouter',
        model: 'openai/test',
        endpoint: OPENROUTER_URL,
        method: 'POST',
        status: 502,
        statusText: 'Bad Gateway',
        responseBody: 'upstream unavailable'
      });
      expect(JSON.parse(JSON.stringify(error))).toMatchObject({
        name: 'ModelRequestError',
        provider: 'openrouter',
        status: 502,
        responseBody: 'upstream unavailable'
      });
    }
  });
});

type CapturedRequest = {
  input: RequestInfo | URL;
  init?: RequestInit;
};

function captureFetch(requests: CapturedRequest[], json: unknown): FetchLike {
  return async (input, init) => {
    requests.push({ input, init });
    return new Response(JSON.stringify(json), {
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'application/json' }
    });
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
