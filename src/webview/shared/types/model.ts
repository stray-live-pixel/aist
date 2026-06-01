export type ProviderProfile = {
  id: string;
  name: string;
  provider: ModelProvider;
  endpoint: string;
  proxyHost: string;
  builtIn: boolean;
  apiKeyConfigured: boolean;
  apiKeySource: 'profile-secret' | 'legacy-global-secret' | 'unsupported' | 'none';
};

export type ProviderProfileInput = Partial<
  Pick<ProviderProfile, 'id' | 'name' | 'provider' | 'endpoint' | 'proxyHost'>
>;

export type ModelProvider = 'openrouter' | 'codex';

export type ModelOption = {
  id: string;
  name: string;
  provider?: 'openrouter' | 'codex';
  contextLength?: number;
  pricing?: {
    prompt?: number;
    completion?: number;
  };
  supportsTools: boolean;
  /** Какие ускоренные service_tier доступны для ChatGPT Codex; отсутствие поля скрывает control в UI. */
  codexServiceTiers?: Exclude<CodexServiceTier, 'auto'>[];
};

export type ToolPermissionMode = 'ask' | 'auto';
export type ReasoningEffort = 'auto' | 'low' | 'medium' | 'high' | 'xhigh';
export type CodexServiceTier = 'auto' | 'priority';
export type EditorContextMode = 'auto' | 'selection' | 'file' | 'off';
export type AgentLanguage = 'ru' | 'en';
export type AuxiliaryModelId = 'compaction' | 'tool' | 'memory';
export type AuxiliaryModelSettings = {
  model: string;
  reasoningEffort: ReasoningEffort;
  allowTools: boolean;
};
export type AuxiliaryToolModelOverride = AuxiliaryModelSettings & {
  toolName: string;
};
export type AuxiliaryToolModelSettings = AuxiliaryModelSettings & {
  overrides: AuxiliaryToolModelOverride[];
};
export type AuxiliaryModelsSettings = {
  compaction: AuxiliaryModelSettings;
  tool: AuxiliaryToolModelSettings;
  memory: AuxiliaryModelSettings;
};
