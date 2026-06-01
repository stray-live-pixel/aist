import { type ReasoningEffort } from '../../../shared/types/types';
import { type FetchLike, type ModelTransportLogger } from '../modelTransport';

export type OpenRouterTransportOptions = {
  apiKey?: string;
  model?: string;
  siteUrl?: string;
  siteName?: string;
  reasoningEffort?: ReasoningEffort;
  fetch?: FetchLike;
  logger?: ModelTransportLogger;
  chatEndpoint?: string;
  modelsEndpoint?: string;
  proxyHost?: string;
  temperature?: number;
  missingApiKeyMessage?: string;
};
