export type IsolationSessionStatus =
  | 'queued'
  | 'preparing'
  | 'creating'
  | 'running_agent'
  | 'post_processing'
  | 'committing'
  | 'pushing'
  | 'creating_pr'
  | 'ready_for_review'
  | 'failed'
  | 'stopping'
  | 'destroyed';

export type IsolationProviderKind = 'docker-local';

export type IsolationFlowModeSummary = {
  readonly flowId: string;
  readonly title: string;
  readonly description?: string;
  readonly stageCount: number;
  readonly sourceKind: 'native' | 'legacy';
  readonly defaultModel?: string;
  readonly defaultCodexModel?: string;
};

export type IsolationFlowRunStatus = 'created' | 'running' | 'paused' | 'finished' | 'stopped' | 'error';

export type IsolationFlowStageSummary = {
  readonly index: number;
  readonly title: string;
  readonly status: 'pending' | 'running' | 'done' | 'error' | 'stopped';
  readonly model?: string;
  readonly error?: string;
};

export type IsolationFlowSelection = {
  readonly flowId: string;
  readonly title: string;
  readonly stageCount: number;
  readonly autonomousSessionId?: string;
  readonly status?: IsolationFlowRunStatus;
  readonly currentStageIndex?: number;
  readonly stages?: readonly IsolationFlowStageSummary[];
};

export type IsolationSessionSummary = {
  readonly sessionId: string;
  readonly taskId: string;
  /** ID стандартного чата, где показывается живой ход работы isolated агента. */
  readonly chatId?: string;
  readonly prompt: string;
  readonly flow?: IsolationFlowSelection;
  readonly branchName: string;
  readonly baseRef?: string;
  readonly remoteName?: string;
  readonly worktreePath?: string;
  readonly provider: IsolationProviderKind;
  readonly status: IsolationSessionStatus;
  readonly stage?: string;
  readonly containerId?: string;
  readonly containerName?: string;
  readonly baseSha?: string;
  readonly headSha?: string;
  readonly commitSha?: string;
  readonly prUrl?: string;
  readonly prNumber?: number;
  readonly lastRunId?: string;
  readonly error?: string;
  readonly attempt: number;
  readonly startedAt?: number;
  readonly finishedAt?: number;
  readonly createdAt: number;
  readonly updatedAt: number;
};

export type IsolationSessionLogEvent = {
  readonly type: 'isolation.session.log';
  readonly sessionId: string;
  readonly level: 'info' | 'warn' | 'error';
  readonly message: string;
  readonly at: number;
};

export type IsolationSessionLifecycleEvent =
  | {
      readonly type: 'isolation.session.created';
      readonly session: IsolationSessionSummary;
      readonly at: number;
    }
  | {
      readonly type: 'isolation.session.status';
      readonly session: IsolationSessionSummary;
      readonly at: number;
    }
  | {
      readonly type: 'isolation.session.destroyed';
      readonly session: IsolationSessionSummary;
      readonly at: number;
    };

export type DaemonIsolationEvent = IsolationSessionLifecycleEvent | IsolationSessionLogEvent;

export type DaemonIsolationStartParams = {
  readonly prompt: string;
  readonly flowId?: string;
  readonly baseRef?: string;
  readonly provider?: IsolationProviderKind;
};

export type DaemonIsolationContinueParams = {
  readonly sessionId: string;
  readonly prompt: string;
  readonly flowId?: string;
};

export type DaemonIsolationSessionParams = {
  readonly sessionId: string;
};

export type DaemonIsolationListResult = {
  readonly operationId: string;
  readonly sessions: readonly IsolationSessionSummary[];
};

export type DaemonIsolationStartResult = {
  readonly operationId: string;
  readonly accepted: true;
  readonly session: IsolationSessionSummary;
};

export type DaemonIsolationStatusResult = {
  readonly operationId: string;
  readonly session: IsolationSessionSummary | null;
};

export type DaemonIsolationStopResult = {
  readonly operationId: string;
  readonly session: IsolationSessionSummary | null;
};

export type DaemonIsolationDestroyResult = {
  readonly operationId: string;
  readonly session: IsolationSessionSummary | null;
};

export type DaemonIsolationEventsResult = {
  readonly operationId: string;
  readonly events: readonly DaemonIsolationEvent[];
};
