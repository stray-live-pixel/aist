import type { SubagentRun } from '../../core/shared/types/types';

export type DaemonSubagentGetParams = {
  readonly runId: string;
};

export type DaemonSubagentGetResult = {
  readonly operationId: string;
  readonly run: SubagentRun;
};

export type DaemonSubagentListParams = {
  readonly parentChatId: string;
};

export type DaemonSubagentListResult = {
  readonly operationId: string;
  readonly runs: readonly SubagentRun[];
};
