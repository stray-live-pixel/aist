export type OpenRouterRole = 'system' | 'user' | 'assistant' | 'tool';

export type OpenRouterMessage = {
  role: OpenRouterRole;
  content?: string;
  reasoning?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  usage?: ModelUsage;
};

export type ModelUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

export type ToolCall = {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments?: string | Record<string, unknown>;
  };
};

export type ModelStreamCallbacks = {
  onReasoningDelta?(delta: string): void;
  onContentDelta?(delta: string): void;
  onComplete?(): void;
};

export type OpenRouterTool = {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type ModelProvider = 'openrouter' | 'codex';

export type OpenRouterModelOption = {
  id: string;
  name: string;
  provider: ModelProvider;
  contextLength?: number;
  pricing?: OpenRouterModelPricing;
  supportsTools: boolean;
};

export type OpenRouterModelPricing = {
  prompt?: number;
  completion?: number;
};
