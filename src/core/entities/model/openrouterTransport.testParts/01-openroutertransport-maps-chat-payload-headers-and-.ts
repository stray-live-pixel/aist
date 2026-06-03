import { describe, expect, it } from 'vitest';

import type { OpenRouterTool } from '../../../shared/types/types';
import { OPENROUTER_MODELS_URL, OPENROUTER_URL } from '../modelDefaults';
import { getModelRequestErrorInfo } from '../modelErrors';
import { MODEL_REQUEST_TIMEOUT_MS } from '../modelRequestTimeout';
import type { FetchLike } from '../modelTransport';
import { OpenRouterTransport } from '../openrouterTransport';
import { CapturedRequest, captureFetch, captureTextFetch, createTool, readJsonBody, sseData } from './helpers';

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
    const initWithDispatcher = requests[0].init as RequestInit & { dispatcher?: Record<symbol, unknown> };
    const dispatcherOptions = Object.getOwnPropertySymbols(initWithDispatcher.dispatcher || {})
      .map((symbol) => initWithDispatcher.dispatcher?.[symbol])
      .find((value) => typeof value === 'object' && value !== null && 'bodyTimeout' in value);
    expect(dispatcherOptions).toMatchObject({
      bodyTimeout: MODEL_REQUEST_TIMEOUT_MS,
      headersTimeout: MODEL_REQUEST_TIMEOUT_MS
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
});
