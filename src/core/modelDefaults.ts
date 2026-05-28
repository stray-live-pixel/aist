import type { OpenRouterModelOption } from './types';

export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
export const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
export const CODEX_RESPONSES_URL = 'https://chatgpt.com/backend-api/codex/responses';
export const DEFAULT_MODEL = 'openai/gpt-4o-mini';
export const DEFAULT_CODEX_MODEL = 'codex:gpt-5.1-codex';

/**
 * Fallback-каталог используется до успешной загрузки моделей и для Codex, где список
 * берём из известного набора ChatGPT моделей. Поле codexServiceTiers включено только
 * для Codex: OpenRouter не должен получать chatgpt-specific параметр service_tier.
 */
export const FALLBACK_MODEL_OPTIONS = [
  {
    id: DEFAULT_MODEL,
    name: 'GPT-4o mini',
    provider: 'openrouter' as const,
    contextLength: undefined,
    supportsTools: true
  },
  {
    id: 'codex:gpt-5.5',
    name: 'GPT-5.5',
    provider: 'codex' as const,
    contextLength: 400000,
    supportsTools: true,
    codexServiceTiers: ['priority' as const]
  },
  {
    id: 'codex:gpt-5.4',
    name: 'GPT-5.4',
    provider: 'codex' as const,
    contextLength: undefined,
    supportsTools: true,
    codexServiceTiers: ['priority' as const]
  },
  {
    id: 'codex:gpt-5.4-mini',
    name: 'GPT-5.4 Mini',
    provider: 'codex' as const,
    contextLength: undefined,
    supportsTools: true,
    codexServiceTiers: ['priority' as const]
  },
  {
    id: 'codex:gpt-5.3-codex',
    name: 'GPT-5.3 Codex',
    provider: 'codex' as const,
    contextLength: undefined,
    supportsTools: true,
    codexServiceTiers: ['priority' as const]
  },
  {
    id: 'codex:gpt-5.3-codex-spark',
    name: 'GPT-5.3 Codex Spark',
    provider: 'codex' as const,
    contextLength: undefined,
    supportsTools: true,
    codexServiceTiers: ['priority' as const]
  },
  {
    id: 'codex:gpt-5.2',
    name: 'GPT-5.2',
    provider: 'codex' as const,
    contextLength: undefined,
    supportsTools: true,
    codexServiceTiers: ['priority' as const]
  },
  {
    id: 'codex:gpt-5.1-codex',
    name: 'GPT-5.1 Codex',
    provider: 'codex' as const,
    contextLength: undefined,
    supportsTools: true,
    codexServiceTiers: ['priority' as const]
  },
  {
    id: 'codex:gpt-5.1-codex-mini',
    name: 'GPT-5.1 Codex Mini',
    provider: 'codex' as const,
    contextLength: undefined,
    supportsTools: true,
    codexServiceTiers: ['priority' as const]
  },
  {
    id: 'codex:gpt-5.2-codex',
    name: 'GPT-5.2 Codex',
    provider: 'codex' as const,
    contextLength: undefined,
    supportsTools: true,
    codexServiceTiers: ['priority' as const]
  }
] satisfies OpenRouterModelOption[];
