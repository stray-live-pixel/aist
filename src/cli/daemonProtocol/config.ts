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

export type DaemonConfigGetParams = {
  readonly key?: string;
};

export type DaemonConfigUpdateParams = {
  readonly key: string;
  readonly value: JsonValue;
  readonly scope?: ConfigScope;
};

export type DaemonConfigGetResult = {
  readonly operationId: string;
  readonly config:
    | {
        readonly key: string;
        readonly value: JsonValue | null;
        readonly source: 'workspace' | 'global' | 'unset';
        readonly redacted: boolean;
      }
    | {
        readonly values: JsonObject;
        readonly redacted: boolean;
      };
};

export type DaemonConfigUpdateResult = {
  readonly operationId: string;
  readonly key: string;
  readonly value: JsonValue | null;
  readonly scope: ConfigScope;
  readonly redacted: boolean;
};

export type DaemonModelsParams = {
  readonly provider?: 'openrouter' | 'codex' | 'all';
};

export type DaemonModelsResult = {
  readonly operationId: string;
  readonly provider: 'openrouter' | 'codex' | 'all';
  readonly refreshed: boolean;
  readonly fallbackUsed: boolean;
  readonly errors: readonly string[];
  readonly models: readonly OpenRouterModelOption[];
};
