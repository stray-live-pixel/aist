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

export type IsolationProviderKind = 'docker-local' | 'remote-server';

export type IsolationRunnerAvailability = 'available' | 'busy' | 'unavailable' | 'unknown';

export type IsolationRemoteServerAuthMethod = 'ssh-agent' | 'ssh-key';

export type IsolationRemoteServerGithubAuthMode = 'server-existing' | 'ssh-agent-forwarding';

export type IsolationRemoteServerSettings = {
  readonly id: string;
  readonly name: string;
  readonly host: string;
  readonly port: number;
  readonly username: string;
  readonly authMethod: IsolationRemoteServerAuthMethod;
  readonly privateKeyPath?: string;
  readonly githubAuthMode: IsolationRemoteServerGithubAuthMode;
  readonly createdAt: number;
  readonly updatedAt: number;
};

export type IsolationRemoteServerInput = {
  readonly id?: string;
  readonly name: string;
  readonly host: string;
  readonly port?: number;
  readonly username: string;
  readonly authMethod: IsolationRemoteServerAuthMethod;
  readonly privateKeyPath?: string;
  readonly githubAuthMode: IsolationRemoteServerGithubAuthMode;
};

export type IsolationRunnerSummary = {
  readonly id: string;
  readonly provider: IsolationProviderKind;
  readonly label: string;
  readonly description?: string;
  readonly availability: IsolationRunnerAvailability;
  readonly activeSessionId?: string;
  readonly server?: IsolationRemoteServerSettings;
  readonly lastCheckedAt?: number;
  readonly error?: string;
};

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
  readonly runnerId?: string;
  readonly runnerLabel?: string;
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

export type IsolationRemoteServersChangedEvent = {
  readonly type: 'isolation.remoteServers.changed';
  readonly servers: readonly IsolationRemoteServerSettings[];
  readonly at: number;
};

export type IsolationSessionEvent = IsolationSessionLifecycleEvent | IsolationSessionLogEvent;
export type IsolationEvent = IsolationSessionEvent | IsolationRemoteServersChangedEvent;
