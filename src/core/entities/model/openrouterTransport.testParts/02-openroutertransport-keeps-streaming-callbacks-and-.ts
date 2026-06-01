import { describe, expect, it } from 'vitest';

import type { OpenRouterTool } from '../../../shared/types/types';
import { OPENROUTER_MODELS_URL, OPENROUTER_URL } from '../modelDefaults';
import { getModelRequestErrorInfo } from '../modelErrors';
import type { FetchLike } from '../modelTransport';
import { OpenRouterTransport } from '../openrouterTransport';
import { CapturedRequest, captureFetch, captureTextFetch, createTool, readJsonBody, sseData } from './helpers';

describe('OpenRouterTransport', () => {
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
});
