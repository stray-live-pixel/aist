import { describe, expect, it } from 'vitest';

import type { ModelOption } from '../../types';
import { getReasoningOptions } from './getReasoningOptions';

const t = (key: string) => key;

describe('getReasoningOptions', () => {
  it('adds xhigh maximum reasoning effort for Codex models', () => {
    const options = getReasoningOptions({ t, model: createModel({ provider: 'codex' }) });

    expect(options.map((option) => option.value)).toEqual(['auto', 'low', 'medium', 'high', 'xhigh']);
    expect(options.at(-1)).toEqual({ value: 'xhigh', label: 'reasoning.xhigh' });
  });

  it('does not show xhigh for OpenRouter models', () => {
    const options = getReasoningOptions({ t, model: createModel({ provider: 'openrouter' }) });

    expect(options.map((option) => option.value)).toEqual(['auto', 'low', 'medium', 'high']);
  });
});

function createModel(patch: Partial<ModelOption>): ModelOption {
  return {
    id: 'model-a',
    name: 'Model A',
    provider: 'openrouter',
    supportsTools: true,
    ...patch
  };
}
