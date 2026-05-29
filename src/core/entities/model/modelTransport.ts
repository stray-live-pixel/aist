import type {
  ChatModelSettings,
  ModelRequestLifecycleCallbacks,
  ModelStreamCallbacks,
  OpenRouterMessage,
  OpenRouterModelOption,
  OpenRouterTool
} from '../../shared/types/types';

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type ModelTransportLogger = {
  info(message: string, details?: unknown): void;
  error?(message: string, error?: unknown): void;
};

export type ModelRequestOptions = Partial<Pick<ChatModelSettings, 'reasoningEffort' | 'codexServiceTier'>>;

export interface ModelClient {
  chat(
    messages: OpenRouterMessage[],
    tools?: OpenRouterTool[],
    modelOverride?: string,
    signal?: AbortSignal,
    stream?: ModelStreamCallbacks,
    lifecycle?: ModelRequestLifecycleCallbacks,
    options?: ModelRequestOptions
  ): Promise<OpenRouterMessage>;
}

export interface ModelCatalogClient {
  listModels(): Promise<OpenRouterModelOption[]> | OpenRouterModelOption[];
}

export function resolveFetch(fetchImpl?: FetchLike): FetchLike {
  if (fetchImpl) {
    return fetchImpl;
  }

  const resolved = globalThis.fetch;
  if (!resolved) {
    throw new Error('A fetch implementation is required for model transport requests.');
  }

  return resolved.bind(globalThis) as FetchLike;
}
