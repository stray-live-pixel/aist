import type {
  DaemonChat,
  DaemonChatAskResult,
  DaemonChatCreateResult,
  DaemonChatGetResult,
  DaemonEvent,
  DaemonModelsResult,
  DaemonState,
  JsonRpcErrorObject
} from '../../cli/daemonProtocol';

export type AgentWebRpcRequest = {
  readonly method: string;
  readonly params?: unknown;
};

export type AgentWebRpcSuccess<T = unknown> = {
  readonly ok: true;
  readonly result: T;
};

export type AgentWebRpcFailure = {
  readonly ok: false;
  readonly error: JsonRpcErrorObject;
};

export type AgentWebRpcResponse<T = unknown> = AgentWebRpcSuccess<T> | AgentWebRpcFailure;

export type AgentWebEventMessage =
  | {
      readonly type: 'connected';
      readonly at: number;
    }
  | {
      readonly type: 'daemon.event';
      readonly event: DaemonEvent;
    };

export type AgentWebStateResult = DaemonState;

export type AgentWebChatCreateResult = DaemonChatCreateResult;
export type AgentWebChatGetResult = DaemonChatGetResult;
export type AgentWebChatAskResult = DaemonChatAskResult;
export type AgentWebModelsResult = DaemonModelsResult;
export type AgentWebChat = DaemonChat;
