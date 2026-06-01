import { describe, expect, it } from 'vitest';

import type { OpenRouterTool } from '../../../shared/types/types';
import { OPENROUTER_MODELS_URL, OPENROUTER_URL } from '../modelDefaults';
import { getModelRequestErrorInfo } from '../modelErrors';
import type { FetchLike } from '../modelTransport';
import { OpenRouterTransport } from '../openrouterTransport';

export type CapturedRequest = {
  input: RequestInfo | URL;
  init?: RequestInit;
};

export function captureFetch(requests: CapturedRequest[], json: unknown): FetchLike {
  return async (input, init) => {
    requests.push({ input, init });
    return new Response(JSON.stringify(json), {
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'application/json' }
    });
  };
}

export function captureTextFetch(
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

export function readJsonBody(init: RequestInit | undefined): unknown {
  return JSON.parse(String(init?.body));
}

export function sseData(data: unknown): string {
  return `data: ${JSON.stringify(data)}`;
}

export function createTool(): OpenRouterTool {
  return {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read a file',
      parameters: { type: 'object', properties: { path: { type: 'string' } } }
    }
  };
}
