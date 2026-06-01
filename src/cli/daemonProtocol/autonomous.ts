import type { ConfigScope } from '../../core/app/config/config';
import type { AgentMemoryItem } from '../../core/entities/memory/memory';
import type {
  AutonomousBackendEvent,
  AutonomousExportFormat,
  AutonomousLaunchOptions,
  AutonomousStartResult,
  AutonomousState,
  AutonomousStopResult
} from '../../core/processes/autonomous';
import type { EditorContextInput } from '../../core/shared/types/types';
import type {
  AgentReflectionCandidate,
  ApprovalPreviewResolution,
  ApprovalResolveRequest,
  ChatMessage,
  ChatModelSettings,
  ChatSummary,
  ChatVcsState,
  JsonObject,
  JsonValue,
  OpenRouterModelOption,
  RuntimeEvent,
  SubagentRun
} from '../../core/shared/types/types';

export type DaemonAutonomousStateResult = {
  readonly operationId: string;
  readonly state: AutonomousState;
};

export type DaemonAutonomousFlowStartParams = {
  readonly flowId: string;
  readonly launch: AutonomousLaunchOptions;
};

export type DaemonAutonomousRunStartParams = {
  readonly runId: string;
  readonly launch: AutonomousLaunchOptions;
};

export type DaemonAutonomousStartResult = AutonomousStartResult;

export type DaemonAutonomousStopParams = {
  readonly sessionId: string;
};

export type DaemonAutonomousStopResult = AutonomousStopResult;

export type DaemonAutonomousExportParams = {
  readonly sessionId: string;
  readonly format?: AutonomousExportFormat;
};

export type DaemonAutonomousExportResult = {
  readonly operationId: string;
  readonly sessionId: string;
  readonly format: AutonomousExportFormat;
  readonly content: string;
};
