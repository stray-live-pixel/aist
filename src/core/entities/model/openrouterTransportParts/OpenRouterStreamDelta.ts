import { OpenRouterToolCallDelta } from './OpenRouterToolCallDelta';

export type OpenRouterStreamDelta = {
  content?: string;
  reasoning?: string;
  reasoning_content?: string;
  reasoning_details?: Array<{ text?: string }>;
  tool_calls?: OpenRouterToolCallDelta[];
};
