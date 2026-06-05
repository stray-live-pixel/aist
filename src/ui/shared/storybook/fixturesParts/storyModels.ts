import { type ModelOption } from '../../types';

export const storyModels: ModelOption[] = [
  {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openrouter',
    contextLength: 128000,
    pricing: { prompt: 0.15, completion: 0.6 },
    supportsTools: true
  },
  {
    id: 'anthropic/claude-3.7-sonnet',
    name: 'Claude 3.7 Sonnet',
    provider: 'openrouter',
    contextLength: 200000,
    pricing: { prompt: 3, completion: 15 },
    supportsTools: true
  },
  {
    id: 'codex:gpt-5.1-codex',
    name: 'GPT-5.1 Codex',
    provider: 'codex',
    contextLength: 256000,
    supportsTools: true,
    codexServiceTiers: ['priority']
  },
  {
    id: 'meta-llama/llama-3.1-8b-instruct',
    name: 'Llama 3.1 8B Instruct',
    provider: 'openrouter',
    contextLength: 131000,
    supportsTools: false
  }
];
