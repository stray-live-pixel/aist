export type AutonomousVcsCommand = 'git' | 'arc' | (string & {});

export type AutonomousVcsIsolationOptions = {
  enabled: boolean;
  command?: AutonomousVcsCommand;
  baseBranch?: string;
  branchName?: string;
  worktreePath?: string;
  keepWorktree?: boolean;
};

export type AutonomousVcsEnvironment = {
  command: AutonomousVcsCommand;
  baseBranch: string;
  branchName: string;
  worktreePath: string;
  keepWorktree: boolean;
};
