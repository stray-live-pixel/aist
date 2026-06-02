import { describe, expect, it } from 'vitest';

import type { OpenRouterMessage, OpenRouterTool } from '../../../shared/types/types';
import { CodexResponsesTransport, type CodexTokenProvider } from '../codexTransport';
import { CODEX_RESPONSES_URL } from '../modelDefaults';
import { getModelRequestErrorInfo } from '../modelErrors';
import type { FetchLike } from '../modelTransport';
import { CapturedRequest, captureTextFetch, createTokenProvider, createTool, readJsonBody, sseData } from './helpers';

describe('CodexResponsesTransport', () => {
  it('routes Responses API request through proxy host when configured', async () => {
    const requests: CapturedRequest[] = [];
    const fetch = captureTextFetch(
      requests,
      sseData({ type: 'response.output_text.delta', delta: 'ok' }) + '\n\n',
      'text/event-stream'
    );
    const transport = new CodexResponsesTransport({
      tokenProvider: createTokenProvider(),
      fetch,
      endpoint: 'https://chatgpt.example/backend-api/codex/responses',
      proxyHost: 'https://corp-proxy.example/codex'
    });

    await transport.chat([{ role: 'user', content: 'hello' }]);

    expect(requests[0].input).toBe(
      'https://corp-proxy.example/codex/?endpoint=https%3A%2F%2Fchatgpt.example%2Fbackend-api%2Fcodex%2Fresponses'
    );
  });
});
