import type { DaemonChat, DaemonState } from '../../../cli/daemonProtocol';
import type {
  AgentState,
  Chat,
  ChatMessage,
  ChatSummary,
  IsolationFlowModeSummary,
  IsolationRemoteServerSettings,
  IsolationRunnerSummary,
  IsolationSessionSummary,
  ModelOption
} from '../../shared/types';
import { createDefaultAgentState } from './createDefaultAgentState';

// Daemon protocol типизирует часть полей чата как opaque JsonValue. Реальные значения совпадают с
// типами общего UI (это одни и те же данные), поэтому здесь явно сужаем их через cast.
function mapDaemonChatToChat(chat: DaemonChat): Chat {
  return {
    id: chat.id,
    title: chat.title,
    model: chat.model,
    modelSettings: chat.modelSettings,
    previousChatId: chat.previousChatId ?? undefined,
    compactedAt: chat.compactedAt ?? undefined,
    compactionModel: chat.compactionModel ?? undefined,
    vcs: chat.vcs,
    messages: chat.messages as unknown as ChatMessage[],
    lastAnswer: chat.lastAnswer,
    activity: (chat.activity ?? undefined) as Chat['activity'],
    activityDetail: chat.activityDetail ?? undefined,
    modelRequest: (chat.modelRequest ?? undefined) as Chat['modelRequest'],
    busy: chat.busy,
    context: (chat.context ?? undefined) as Chat['context'],
    contextLength: chat.contextLength ?? undefined,
    activePlan: (chat.activePlan ?? undefined) as Chat['activePlan'],
    reflectionCandidates: chat.reflectionCandidates as unknown as Chat['reflectionCandidates'],
    usage: chat.usage as unknown as Chat['usage'],
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt
  };
}

function workspaceName(workspaceRoot: string): string {
  const segments = workspaceRoot.split(/[/\\]/).filter(Boolean);
  return segments[segments.length - 1] ?? workspaceRoot;
}

/**
 * Собирает AgentState для web shell из доступных данных daemon.
 *
 * Накладывает реальные поля (workspace, чаты, активный чат, модели, isolation) поверх безопасного
 * baseline. Поля, которые на web ещё не отдаёт сервер (настройки, режимы, permissions, телеметрия),
 * остаются дефолтными до расширения web server adapter — это задокументированный gap паритета.
 */
export function mapDaemonStateToAgentState(params: {
  daemonState: DaemonState;
  activeChat: DaemonChat | null;
  models: readonly ModelOption[];
}): AgentState {
  const base = createDefaultAgentState();

  return {
    ...base,
    workspaceName: workspaceName(params.daemonState.workspaceRoot),
    chats: params.daemonState.chats as unknown as ChatSummary[],
    models: [...params.models],
    activeChat: params.activeChat ? mapDaemonChatToChat(params.activeChat) : base.activeChat,
    isolationFlowModes: params.daemonState.isolationFlowModes as unknown as IsolationFlowModeSummary[],
    isolationSessions: params.daemonState.isolationSessions as unknown as IsolationSessionSummary[],
    isolationRunners: params.daemonState.isolationRunners as unknown as IsolationRunnerSummary[],
    isolationRemoteServers: params.daemonState.isolationRemoteServers as unknown as IsolationRemoteServerSettings[]
  };
}
