import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';

import type { ConfigScope } from '../core/app/config/config';
import type { EditorContextInput } from '../core/features/context/contextGovernor';
import type {
  AutonomousBackendEvent,
  AutonomousExportFormat,
  AutonomousLaunchOptions,
  AutonomousStartResult,
  AutonomousState,
  AutonomousStopResult
} from '../core/processes/autonomous';
import type {
  ApprovalPreviewResolution,
  ApprovalResolveRequest,
  ChatMessage,
  ChatSummary,
  JsonObject,
  JsonValue,
  OpenRouterModelOption,
  RuntimeEvent
} from '../core/shared/types/types';

export const DAEMON_PROTOCOL_VERSION = 1;
export const DAEMON_EVENT_METHOD = 'event';
export const DAEMON_BUSY_ERROR_CODE = 'run.busy';

export type JsonRpcId = string | number | null;

export type JsonRpcRequest = {
  readonly jsonrpc: '2.0';
  readonly id?: JsonRpcId;
  readonly method: string;
  readonly params?: unknown;
};

export type JsonRpcErrorObject = {
  readonly code: number;
  readonly message: string;
  readonly data?: JsonObject;
};

export type JsonRpcResponse = {
  readonly jsonrpc: '2.0';
  readonly id: JsonRpcId;
  readonly result?: unknown;
  readonly error?: JsonRpcErrorObject;
};

export type JsonRpcNotification = {
  readonly jsonrpc: '2.0';
  readonly method: string;
  readonly params?: unknown;
};

export type DaemonTransportInfo = {
  readonly kind: 'local-socket';
  readonly framing: 'json-rpc-2.0-newline-delimited';
  readonly socketPath: string;
};

export type DaemonActiveRun = {
  readonly runId: string;
  readonly chatId: string;
};

export type DaemonState = {
  readonly workspaceRoot: string;
  readonly protocolVersion: number;
  readonly transport: DaemonTransportInfo;
  readonly activeRun: DaemonActiveRun | null;
  readonly chats: readonly ChatSummary[];
};

export type DaemonStateChangedEvent = {
  readonly type: 'state.changed';
  readonly workspaceRoot: string;
  readonly reason?: string;
  readonly activeRun: DaemonActiveRun | null;
  readonly at: number;
};

export type DaemonAutonomousEvent = AutonomousBackendEvent;

export type DaemonEvent = RuntimeEvent | DaemonStateChangedEvent | DaemonAutonomousEvent;

export type DaemonInitializeResult = {
  readonly operationId: string;
  readonly state: DaemonState;
};

export type DaemonChatCreateParams = {
  readonly model?: string;
};

export type DaemonChatCreateResult = {
  readonly operationId: string;
  readonly chat: DaemonChat;
};

export type DaemonChatListResult = {
  readonly operationId: string;
  readonly chats: readonly ChatSummary[];
};

export type DaemonChatGetParams = {
  readonly chatId: string;
};

export type DaemonChatGetResult = {
  readonly operationId: string;
  readonly chat: DaemonChat;
};

export type DaemonChatAskParams = {
  readonly chatId: string;
  readonly prompt: string;
};

export type DaemonChatAskResult = {
  readonly operationId: string;
  readonly runId: string;
  readonly chatId: string;
  readonly accepted: true;
};

export type DaemonChatStopParams = {
  readonly runId?: string;
};

export type DaemonChatStopResult = {
  readonly operationId: string;
  readonly stopped: boolean;
  readonly runId?: string;
};

export type DaemonChatDeleteParams = {
  readonly chatId: string;
};

export type DaemonChatDeleteResult = {
  readonly operationId: string;
  readonly deleted: boolean;
  readonly nextChatId?: string;
};

export type DaemonChatClearParams = {
  readonly chatId: string;
};

export type DaemonChatClearResult = {
  readonly operationId: string;
  readonly chat: DaemonChat;
};

export type DaemonChatSetModelParams = {
  readonly chatId: string;
  readonly model: string;
};

export type DaemonChatSetModelResult = {
  readonly operationId: string;
  readonly chat: DaemonChat;
};

export type DaemonChatCompactParams = {
  readonly chatId: string;
  readonly keepLastMessages?: number;
  readonly summary?: string;
};

export type DaemonChatCompactResult = {
  readonly operationId: string;
  readonly chat: DaemonChat;
};

export type DaemonApprovalResolveParams = ApprovalResolveRequest & {
  readonly approvalId?: string;
  readonly messageId?: string;
};

export type DaemonApprovalResolveResult = {
  readonly operationId: string;
  readonly resolved: boolean;
  readonly approvalId?: string;
  readonly messageId?: string;
};

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

export type DaemonEventsSubscribeResult = {
  readonly operationId: string;
  readonly subscribed: boolean;
};

export type DaemonClientCapabilities = {
  readonly activeEditorContext?: boolean;
  readonly notifications?: boolean;
  readonly openWorkspaceFile?: boolean;
  readonly vscodeEditableDiffPreview?: boolean;
};

export type DaemonClientCapabilitiesParams = {
  readonly capabilities: DaemonClientCapabilities;
};

export type DaemonClientCapabilitiesResult = {
  readonly operationId: string;
  readonly capabilities: DaemonClientCapabilities;
};

export type DaemonClientPreviewPrepareParams = {
  readonly previewId: string;
  readonly toolName: string;
  readonly args: JsonObject;
};

export type DaemonClientPreviewPrepareResult = {
  readonly preview?: JsonObject;
};

export type DaemonClientPreviewApproveParams = {
  readonly previewId: string;
};

export type DaemonClientPreviewCleanupParams = {
  readonly previewId: string;
};

export type DaemonClientPreviewCleanupResult = {
  readonly ok: true;
};

export type DaemonClientNotificationParams = {
  readonly level: 'info' | 'warning' | 'error' | 'status';
  readonly message: string;
  readonly timeoutMs?: number;
};

export type DaemonClientNotificationResult = {
  readonly shown: boolean;
};

export type DaemonClientOpenWorkspaceFileParams = {
  readonly path: string;
  readonly line?: number;
  readonly column?: number;
  readonly endLine?: number;
  readonly endColumn?: number;
};

export type DaemonClientOpenWorkspaceFileResult = {
  readonly opened: boolean;
};

export type DaemonClientRequestMap = {
  readonly 'client.activeEditorContext': {
    readonly params: undefined;
    readonly result: EditorContextInput | null;
  };
  readonly 'client.notification': {
    readonly params: DaemonClientNotificationParams;
    readonly result: DaemonClientNotificationResult;
  };
  readonly 'client.openWorkspaceFile': {
    readonly params: DaemonClientOpenWorkspaceFileParams;
    readonly result: DaemonClientOpenWorkspaceFileResult;
  };
  readonly 'client.previewEdit.prepare': {
    readonly params: DaemonClientPreviewPrepareParams;
    readonly result: DaemonClientPreviewPrepareResult;
  };
  readonly 'client.previewEdit.approve': {
    readonly params: DaemonClientPreviewApproveParams;
    readonly result: JsonObject;
  };
  readonly 'client.previewEdit.cleanup': {
    readonly params: DaemonClientPreviewCleanupParams;
    readonly result: DaemonClientPreviewCleanupResult;
  };
};

export type DaemonClientRequestMethod = keyof DaemonClientRequestMap;

export type DaemonClientPreviewResolution = ApprovalPreviewResolution;

export type DaemonChat = {
  readonly id: string;
  readonly title: string;
  readonly model: string;
  readonly previousChatId: string | null;
  readonly compactedAt: number | null;
  readonly messages: readonly ChatMessage[];
  readonly history: readonly JsonValue[];
  readonly lastAnswer: string;
  readonly busy: boolean;
  readonly activity: string | null;
  readonly activityDetail: string | null;
  readonly modelRequest: JsonValue | null;
  readonly context: JsonValue | null;
  readonly contextLength: number | null;
  readonly activePlan: JsonValue | null;
  readonly reflectionCandidates: JsonValue[];
  readonly usage: JsonValue;
  readonly createdAt: number;
  readonly updatedAt: number;
};

export function getDaemonSocketPath(workspaceRoot: string): string {
  const normalizedWorkspaceRoot = path.resolve(workspaceRoot);

  if (process.platform === 'win32') {
    const hash = createHash('sha1').update(normalizedWorkspaceRoot).digest('hex').slice(0, 16);
    return `\\\\.\\pipe\\aist-daemon-${hash}`;
  }

  const hash = createHash('sha1').update(normalizedWorkspaceRoot).digest('hex').slice(0, 16);
  return path.join(os.tmpdir(), `aist-daemon-${hash}.sock`);
}
