import { describe, expect, it } from 'vitest';

import type { ModelOption, ProviderProfile } from '../../shared/types';
import { getActiveModelProvider } from './getActiveModelProvider';
import { getProviderModelOptions } from './getProviderModelOptions';
import { getProviderOptions } from './getProviderOptions';
import { getSelectedProviderProfile } from './getSelectedProviderProfile';

const profiles: ProviderProfile[] = [
  {
    id: 'openrouter',
    name: 'OpenRouter',
    provider: 'openrouter',
    endpoint: '',
    proxyHost: '',
    builtIn: true,
    apiKeyConfigured: true,
    apiKeySource: 'profile-secret'
  },
  {
    id: 'openrouter-work',
    name: 'OpenRouter Work',
    provider: 'openrouter',
    endpoint: '',
    proxyHost: '',
    builtIn: false,
    apiKeyConfigured: false,
    apiKeySource: 'none'
  },
  {
    id: 'codex',
    name: 'Codex',
    provider: 'codex',
    endpoint: '',
    proxyHost: '',
    builtIn: true,
    apiKeyConfigured: false,
    apiKeySource: 'unsupported'
  }
];

const models: ModelOption[] = [
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o mini', provider: 'openrouter', supportsTools: true },
  { id: 'codex:gpt-5.1-codex', name: 'GPT-5.1 Codex', provider: 'codex', supportsTools: true }
];

describe('provider model select display helpers', () => {
  it('builds first-level provider options without reading model catalogs', () => {
    expect(getProviderOptions(profiles)).toEqual([
      { value: 'openrouter', label: 'OpenRouter' },
      { value: 'openrouter-work', label: 'OpenRouter Work' },
      { value: 'codex', label: 'Codex' }
    ]);
  });

  it('filters second-level models by selected provider kind', () => {
    expect(getProviderModelOptions(models, 'codex')).toEqual([
      { value: 'codex:gpt-5.1-codex', label: 'GPT-5.1 Codex' }
    ]);
  });

  it('infers active provider from catalog model or model id prefix', () => {
    expect(getActiveModelProvider('openai/gpt-4o-mini', models, profiles)).toBe('openrouter');
    expect(getActiveModelProvider('codex:unknown', [], profiles)).toBe('codex');
  });

  it('keeps selected profile stable and falls back by provider', () => {
    expect(getSelectedProviderProfile(profiles, 'openrouter-work', 'openrouter')?.id).toBe('openrouter-work');
    expect(getSelectedProviderProfile(profiles, undefined, 'codex')?.id).toBe('codex');
  });
});
