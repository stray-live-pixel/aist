import { type CodexServiceTier } from '../../../shared/types/types';
import { type FetchLike, type ModelTransportLogger } from '../modelTransport';
import { CodexTokenProvider } from './CodexTokenProvider';

export type CodexResponsesTransportOptions = {
  tokenProvider: CodexTokenProvider;
  fetch?: FetchLike;
  logger?: ModelTransportLogger;
  endpoint?: string;
  proxyHost?: string;
  sessionId?: string;
  userAgent?: string;
  defaultModel?: string;
  serviceTier?: CodexServiceTier;
};
