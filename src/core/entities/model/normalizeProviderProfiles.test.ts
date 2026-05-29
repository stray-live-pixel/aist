import { describe, expect, it } from 'vitest';

import { CODEX_RESPONSES_URL, OPENROUTER_URL } from './modelDefaults';
import { normalizeProviderProfiles } from './normalizeProviderProfiles';

describe('normalizeProviderProfiles', () => {
  it('returns built-in provider profiles when config is missing', () => {
    expect(normalizeProviderProfiles(undefined)).toEqual([
      {
        id: 'openrouter',
        name: 'OpenRouter',
        provider: 'openrouter',
        endpoint: OPENROUTER_URL,
        proxyHost: '',
        builtIn: true
      },
      {
        id: 'codex',
        name: 'ChatGPT Codex',
        provider: 'codex',
        endpoint: CODEX_RESPONSES_URL,
        proxyHost: '',
        builtIn: true
      }
    ]);
  });

  it('keeps user duplicates separate from built-ins and trims network fields', () => {
    const profiles = normalizeProviderProfiles([
      {
        id: ' openrouter-work ',
        name: ' OpenRouter Work ',
        provider: 'openrouter',
        endpoint: ' https://proxy.example/openrouter ',
        proxyHost: ' http://corp-proxy.example:8080 '
      }
    ]);

    expect(profiles).toContainEqual({
      id: 'openrouter-work',
      name: 'OpenRouter Work',
      provider: 'openrouter',
      endpoint: 'https://proxy.example/openrouter',
      proxyHost: 'http://corp-proxy.example:8080',
      builtIn: false
    });
  });

  it('ignores invalid profiles and duplicate ids to keep routing deterministic', () => {
    expect(
      normalizeProviderProfiles([
        { id: '', provider: 'openrouter' },
        { id: 'bad-provider', provider: 'unknown' },
        { id: 'openrouter', provider: 'openrouter', endpoint: 'https://malicious.example' },
        { id: 'codex-work', provider: 'codex' },
        { id: 'codex-work', provider: 'codex', endpoint: 'https://duplicate.example' }
      ])
    ).toEqual([
      expect.objectContaining({ id: 'openrouter', endpoint: OPENROUTER_URL, builtIn: true }),
      expect.objectContaining({ id: 'codex', endpoint: CODEX_RESPONSES_URL, builtIn: true }),
      expect.objectContaining({ id: 'codex-work', provider: 'codex', endpoint: '', builtIn: false })
    ]);
  });
});
