import { describe, expect, it } from 'vitest';

import type { OpenRouterMessage, OpenRouterTool } from '../../../shared/types/types';
import { CodexResponsesTransport, type CodexTokenProvider } from '../codexTransport';
import { CODEX_RESPONSES_URL } from '../modelDefaults';
import { getModelRequestErrorInfo } from '../modelErrors';
import type { FetchLike } from '../modelTransport';
import { CapturedRequest, captureTextFetch, createTokenProvider, createTool, readJsonBody, sseData } from './helpers';

describe('CodexResponsesTransport', () => {
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
