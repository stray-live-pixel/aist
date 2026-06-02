import { RunReflectionTraceTool } from './RunReflectionTraceTool';

export type RunReflectionTrace = {
  task: string;
  outcome: string;
  tools: RunReflectionTraceTool[];
  reasons: string[];
  errors: string[];
  approvalFeedback: string[];
  changedFiles: string[];
  verification: string[];
};
