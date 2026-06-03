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

export type IsolationSessionSummary = {
  readonly sessionId: string;
  readonly taskId: string;
  /** ID стандартного чата, где показывается живой ход работы isolated агента. */
  readonly chatId?: string;
  readonly prompt: string;
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

export type IsolationSessionEvent = IsolationSessionLifecycleEvent | IsolationSessionLogEvent;
