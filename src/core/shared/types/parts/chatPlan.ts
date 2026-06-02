export type ChatUsageEstimate = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd?: number;
};

/** Status of an active plan item; persisted in chat state and mirrored to sticky UI. */
export type ChatPlanItemStatus = 'pending' | 'in_progress' | 'done' | 'blocked';

/** One short plan step. The id is stable within the current plan version for React rendering. */
export type ChatPlanItem = {
  id: string;
  text: string;
  status: ChatPlanItemStatus;
};

/** Active working plan for the current chat, controlled by model planning tools. */
export type ChatPlan = {
  title: string;
  items: ChatPlanItem[];
};

export type ChatContextEstimate = {
  tokens?: number;
  maxTokens?: number;
  percent?: number;
  inputCostUsd?: number;
};
