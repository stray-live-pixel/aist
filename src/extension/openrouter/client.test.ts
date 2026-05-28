import { describe, expect, it } from 'vitest';

import type { ConfigStore, SecretStore } from '../../core/config';
import type { FetchLike } from '../../core/modelTransport';
import type { JsonValue } from '../../core/types';
import type { AistLogger } from '../shared/logger';
import { OpenRouterClient } from './client';

describe('OpenRouterClient extension wrapper', () => {
  it('resolves VS Code adapter config before delegating to the transport', async () => {
    const requests: CapturedRequest[] = [];
    const fetch = captureJsonFetch(requests, {
      choices: [{ message: { role: 'assistant', content: 'done' } }],
      usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 }
    });
    const client = new OpenRouterClient(
      createConfigStore({
        model: 'configured-model',
        siteUrl: 'https://aist.example',
        siteName: 'aist',
        reasoningEffort: 'medium'
      }),
      createSecretStore('secret-key'),
      createLogger(),
      {},
      { fetch }
    );

    const response = await client.chat([{ role: 'user', content: 'hello' }]);

    expect(response.usage).toEqual({ promptTokens: 1, completionTokens: 2, totalTokens: 3 });
    expect(requests[0].init?.headers).toMatchObject({
      Authorization: 'Bearer secret-key',
      'HTTP-Referer': 'https://aist.example',
      'X-Title': 'aist'
    });
    expect(readJsonBody(requests[0].init)).toMatchObject({
      model: 'configured-model',
      reasoning: { effort: 'medium' }
    });
  });
});

type CapturedRequest = {
  input: RequestInfo | URL;
  init?: RequestInit;
};

function createConfigStore(values: Record<string, JsonValue>): ConfigStore {
  return {
    async get(key, defaultValue) {
      return (values[key] === undefined ? defaultValue : values[key]) as never;
    }
  };
}

function createSecretStore(apiKey: string): Pick<SecretStore, 'get'> {
  return {
    async get() {
      return apiKey;
    }
  };
}

function createLogger(): AistLogger {
  return {
    info() {},
    error() {},
    show() {},
    dispose() {}
  };
}

function captureJsonFetch(requests: CapturedRequest[], json: unknown): FetchLike {
  return async (input, init) => {
    requests.push({ input, init });
    return new Response(JSON.stringify(json), {
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'application/json' }
    });
  };
}

function readJsonBody(init: RequestInit | undefined): unknown {
  return JSON.parse(String(init?.body));
}
