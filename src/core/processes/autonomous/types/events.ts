export type AutonomousEventLevel = 'debug' | 'info' | 'warning' | 'error';

export type AutonomousEventAction =
  | 'ASSISTANT'
  | 'DONE'
  | 'STAGE'
  | 'STAGE_CTX'
  | 'FLOW'
  | 'WRITE'
  | 'RESULT'
  | 'ERROR'
  | 'SYS'
  | 'DRY'
  | 'BASH'
  | 'EVENT'
  | 'THINKING'
  | 'BATCH';

export type AutonomousEvent = {
  id: string;
  ts: string;
  level: AutonomousEventLevel;
  action: AutonomousEventAction;
  message: string;
  stageIndex?: number;
  taskIndex?: number;
  data?: Record<string, unknown>;
};
