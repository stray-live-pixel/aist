import type { AutonomousBackendEvent } from '../../core/processes/autonomous';
import type { ChatSummary, JsonObject, RuntimeEvent } from '../../core/shared/types/types';

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
  /** @deprecated Use activeRuns for parallel chat execution state. */
  readonly activeRun: DaemonActiveRun | null;
  readonly activeRuns: readonly DaemonActiveRun[];
  readonly chats: readonly ChatSummary[];
};

export type DaemonStateChangedEvent = {
  readonly type: 'state.changed';
  readonly workspaceRoot: string;
  readonly reason?: string;
  /** Чат, состояние которого точно изменилось; clients могут перечитать только его вместо полного списка. */
  readonly chatId?: string;
  /** @deprecated Use activeRuns for parallel chat execution state. */
  readonly activeRun: DaemonActiveRun | null;
  readonly activeRuns: readonly DaemonActiveRun[];
  readonly at: number;
};

export type DaemonAutonomousEvent = AutonomousBackendEvent;

export type DaemonEvent = RuntimeEvent | DaemonStateChangedEvent | DaemonAutonomousEvent;

export type DaemonInitializeResult = {
  readonly operationId: string;
  readonly state: DaemonState;
};
