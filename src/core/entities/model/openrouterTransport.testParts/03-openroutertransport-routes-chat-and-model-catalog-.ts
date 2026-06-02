import { describe, expect, it } from 'vitest';

import type { OpenRouterTool } from '../../../shared/types/types';
import { OPENROUTER_MODELS_URL, OPENROUTER_URL } from '../modelDefaults';
import { getModelRequestErrorInfo } from '../modelErrors';
import type { FetchLike } from '../modelTransport';
import { OpenRouterTransport } from '../openrouterTransport';
import { CapturedRequest, captureFetch, captureTextFetch, createTool, readJsonBody, sseData } from './helpers';

describe('OpenRouterTransport', () => {
  it('routes chat and model catalog requests through proxy host when configured', async () => {
    const chatRequests: CapturedRequest[] = [];
    const chatFetch = captureFetch(chatRequests, { choices: [{ message: { role: 'assistant', content: 'proxied' } }] });
    const transport = new OpenRouterTransport({
      apiKey: 'sk-test',
      fetch: chatFetch,
      chatEndpoint: 'https://openrouter.example/v1/chat/completions',
      modelsEndpoint: 'https://openrouter.example/v1/models',
      proxyHost: 'https://corp-proxy.example/llm'
    });

    await transport.chat([{ role: 'user', content: 'hello' }]);

    expect(chatRequests[0].input).toBe(
      'https://corp-proxy.example/llm/?endpoint=https%3A%2F%2Fopenrouter.example%2Fv1%2Fchat%2Fcompletions'
    );

    const modelRequests: CapturedRequest[] = [];
    const modelTransport = new OpenRouterTransport({
      apiKey: 'sk-test',
      fetch: captureFetch(modelRequests, { data: [] }),
      modelsEndpoint: 'https://openrouter.example/v1/models',
      proxyHost: 'https://corp-proxy.example/llm'
    });

    await modelTransport.listModels();

    expect(modelRequests[0].input).toBe(
      'https://corp-proxy.example/llm/?endpoint=https%3A%2F%2Fopenrouter.example%2Fv1%2Fmodels%3Foutput_modalities%3Dtext'
    );
  });
});
