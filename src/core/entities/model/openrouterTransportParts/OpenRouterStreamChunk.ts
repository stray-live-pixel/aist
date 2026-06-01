import { OpenRouterStreamDelta } from './OpenRouterStreamDelta';
import { OpenRouterUsage } from './OpenRouterUsage';

export type OpenRouterStreamChunk = {
  choices?: Array<{
    delta?: OpenRouterStreamDelta;
  }>;
  usage?: OpenRouterUsage;
};
