import { describe, expect, it } from 'vitest';

import type { OpenRouterModelOption } from './types';
import {
  createEmptyUsage,
  getCallUsageFromModelUsage,
  getChatContextEstimate,
  getChatContextEstimateFromModelUsage,
  mergeUsage
} from './usage';

const model: OpenRouterModelOption = {
  id: 'test-model',
  name: 'Test Model',
  provider: 'openrouter',
  contextLength: 1000,
  pricing: { prompt: 0.000001, completion: 0.000002 },
  supportsTools: true
};

describe('usage helpers', () => {
  it('uses provider token counts for context estimates without guessing from text', () => {
    expect(getChatContextEstimate([], 'system prompt text', model)).toEqual({ maxTokens: 1000 });
    expect(
      getChatContextEstimate([], 'system prompt text', model, {
        promptTokens: 250,
        completionTokens: 0,
        totalTokens: 250
      })
    ).toEqual({
      tokens: 250,
      maxTokens: 1000,
      percent: 25,
      inputCostUsd: 0.00025
    });
    expect(getChatContextEstimateFromModelUsage(undefined, model)).toBeUndefined();
  });

  it('normalizes per-call usage and merges accumulated usage costs', () => {
    const callUsage = getCallUsageFromModelUsage({ promptTokens: 100, completionTokens: 20 }, model.pricing);
    const total = createEmptyUsage();

    mergeUsage(total, callUsage);
    mergeUsage(total, { promptTokens: 2, completionTokens: 3, totalTokens: 5, costUsd: 0.25 });

    expect(callUsage).toEqual({
      promptTokens: 100,
      completionTokens: 20,
      totalTokens: 120,
      costUsd: 0.00014
    });
    expect(total).toEqual({
      promptTokens: 102,
      completionTokens: 23,
      totalTokens: 125,
      costUsd: 0.25014
    });
  });
});
