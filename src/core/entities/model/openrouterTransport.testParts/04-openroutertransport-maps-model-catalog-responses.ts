import { describe, expect, it } from 'vitest';

import type { OpenRouterTool } from '../../../shared/types/types';
import { OPENROUTER_MODELS_URL, OPENROUTER_URL } from '../modelDefaults';
import { getModelRequestErrorInfo } from '../modelErrors';
import type { FetchLike } from '../modelTransport';
import { OpenRouterTransport } from '../openrouterTransport';
import { CapturedRequest, captureFetch, captureTextFetch, createTool, readJsonBody, sseData } from './helpers';

describe('OpenRouterTransport', () => {
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
});
