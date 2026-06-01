import { type OpenRouterMessage } from '../../../shared/types/types';
import { CodexOutputItem } from './CodexOutputItem';
import { CodexUsage } from './CodexUsage';

export type CodexResponse = {
  output_text?: string;
  output?: CodexOutputItem[];
  choices?: Array<{
    message?: OpenRouterMessage;
  }>;
  usage?: CodexUsage;
};
