import { describe, expect, it } from 'vitest';

import type { OpenRouterMessage, OpenRouterTool } from '../../../shared/types/types';
import { CodexResponsesTransport, type CodexTokenProvider } from '../codexTransport';
import { CODEX_RESPONSES_URL } from '../modelDefaults';
import { getModelRequestErrorInfo } from '../modelErrors';
import type { FetchLike } from '../modelTransport';
import { CapturedRequest, captureTextFetch, createTokenProvider, createTool, readJsonBody, sseData } from './helpers';

describe('CodexResponsesTransport', () => {
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
});
