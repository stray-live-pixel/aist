import type { JsonObject } from './json';

export type ModelProvider = 'openrouter' | 'codex';
export type CodexServiceTier = 'auto' | 'priority';
export type ReasoningEffort = 'auto' | 'low' | 'medium' | 'high' | 'xhigh';
export type EditorContextMode = 'auto' | 'selection' | 'file' | 'off';

/**
 * Снимок активного редактора, который host может передать агенту.
 *
 * Тип описывает пользовательский рабочий контекст: какой файл открыт, что выделено
 * и какой режим пользователь выбрал для передачи editor context в модель.
 */
export type EditorContextInput = {
  /** Путь или имя открытого файла, чтобы агент понимал, с каким рабочим артефактом связан запрос. */
  fileName: string;
  /** Язык открытого файла, чтобы агент мог точнее интерпретировать синтаксис и проверки. */
  languageId: string;
  /** Выделенный пользователем фрагмент, если задача относится к конкретному участку файла. */
  selectionText: string;
  /** Полный текст открытого файла, если выбран режим передачи файла целиком. */
  fullText: string;
  /** Пользовательский режим передачи editor context: автоматически, выделение, файл целиком или выключено. */
  mode: EditorContextMode;
};

export type ModelTransportRole = 'system' | 'user' | 'assistant' | 'tool';
export type OpenRouterRole = ModelTransportRole;

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

export type ModelTransportMessage = {
  role: ModelTransportRole;
  content?: string;
  reasoning?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  usage?: ModelUsage;
};

export type OpenRouterMessage = ModelTransportMessage;

export type ModelStreamCallbacks = {
  onReasoningDelta?(delta: string): void;
  onContentDelta?(delta: string): void;
  onComplete?(): void;
};

export type ModelHttpResponseInfo = {
  status: number;
  statusText: string;
};

export type ModelRequestLifecycleCallbacks = {
  onResponseHeaders?(info: ModelHttpResponseInfo): void;
};

export type ModelTransportTool = {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type OpenRouterTool = ModelTransportTool;

export type OpenRouterModelOption = {
  id: string;
  name: string;
  provider: ModelProvider;
  contextLength?: number;
  pricing?: OpenRouterModelPricing;
  supportsTools: boolean;
  /**
   * Service tiers that can be sent to the ChatGPT Codex Responses API for this model.
   * Missing value means the UI hides the selector and the transport omits service_tier.
   */
  codexServiceTiers?: Exclude<CodexServiceTier, 'auto'>[];
};

export type OpenRouterModelPricing = {
  prompt?: number;
  completion?: number;
};
