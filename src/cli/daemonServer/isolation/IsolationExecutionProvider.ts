export type IsolationRunnerStartInput = {
  readonly sessionId: string;
  readonly worktreePath?: string;
};

export type IsolationRunnerStartResult = {
  readonly containerId: string;
  readonly containerName: string;
  readonly workspacePath?: string;
};

export type IsolationRunnerExecResult = {
  readonly ok: boolean;
  readonly exitCode: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly timedOut: boolean;
  readonly durationMs: number;
};

export type IsolationExecutionProvider = {
  healthcheck(): Promise<void>;
  start(input: IsolationRunnerStartInput): Promise<IsolationRunnerStartResult>;
  exec(input: {
    readonly container: string;
    readonly script: string;
    readonly cwd?: string;
    readonly timeoutMs?: number;
    readonly maxOutputChars?: number;
    readonly stdin?: string;
  }): Promise<IsolationRunnerExecResult>;
  destroy(containerIdOrName: string): Promise<void>;
};
