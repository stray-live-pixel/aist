export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
export const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
export const DEFAULT_MODEL = 'openai/gpt-4o-mini';

export const FALLBACK_MODEL_OPTIONS = [
  {
    id: DEFAULT_MODEL,
    name: 'GPT-4o mini',
    contextLength: undefined,
    supportsTools: true
  }
];
