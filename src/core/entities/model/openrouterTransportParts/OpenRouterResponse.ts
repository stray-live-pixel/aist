import { type OpenRouterMessage } from '../../../shared/types/types';
import { OpenRouterUsage } from './OpenRouterUsage';

export type OpenRouterResponse = {
  choices?: Array<{
    message?: OpenRouterMessage;
  }>;
  usage?: OpenRouterUsage;
};
