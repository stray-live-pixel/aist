import { describe, expect, it } from 'vitest';

import type { OpenRouterTool } from '../../../shared/types/types';
import { OPENROUTER_MODELS_URL, OPENROUTER_URL } from '../modelDefaults';
import { getModelRequestErrorInfo } from '../modelErrors';
import type { FetchLike } from '../modelTransport';
import { OpenRouterTransport } from '../openrouterTransport';
import { CapturedRequest, captureFetch, captureTextFetch, createTool, readJsonBody, sseData } from './helpers';

describe('OpenRouterTransport', () => {
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
