export type AgentRunActivity = 'thinking' | 'waitingForApproval' | 'runningTool' | 'answering' | 'stopping';

export type AgentRunStatus = 'running' | 'waitingForApproval' | 'stopping' | 'completed' | 'failed' | 'stopped';
