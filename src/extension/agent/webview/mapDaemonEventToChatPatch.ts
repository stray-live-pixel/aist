import type { DaemonEvent } from '../../../cli/daemonProtocol';
import type { AgentChatStore } from '../../chats/chatDataStore';
import type { Chat } from '../../chats/types';
import { getDaemonEventChatId } from './getDaemonEventChatId';

type ChatPatchMessage = {
  type: 'chat.patch';
  chatId: string;
  message?: Chat['messages'][number];
  chat?: Partial<
    Pick<
      Chat,
      | 'busy'
      | 'activity'
      | 'activityDetail'
      | 'modelRequest'
      | 'lastAnswer'
      | 'usage'
      | 'context'
      | 'contextLength'
      | 'activePlan'
      | 'reflectionCandidates'
      | 'updatedAt'
    >
  >;
  summary?: ReturnType<AgentChatStore['getSummaries']>[number];
  reason?: string;
};

/**
 * Что это: превращает подтверждённое daemon-событие в маленький patch для webview.
 * Зачем нужно: чат остаётся консистентным с backend, но UI больше не ждёт полный AgentState на каждое сообщение
 * или изменение статуса выполнения.
 */
export function mapDaemonEventToChatPatch(event: DaemonEvent, chats: AgentChatStore): ChatPatchMessage | undefined {
  const chatId = getDaemonEventChatId(event);
  if (!chatId) {
    return undefined;
  }

  const chat = chats.getChat(chatId);
  if (!chat) {
    return undefined;
  }

  const summary = chats.getSummaries().find((item) => item.id === chat.id);
  const base = {
    type: 'chat.patch' as const,
    chatId: chat.id,
    summary,
    reason: event.type
  };

  switch (event.type) {
    case 'message.appended':
      return {
        ...base,
        message: event.message as Chat['messages'][number],
        chat: pickChatRuntimeFields(chat)
      };
    case 'run.started':
    case 'run.activity':
    case 'run.finished':
    case 'run.failed':
    case 'run.stopped':
    case 'run.error':
    case 'model.request.updated':
    case 'chat.updated':
    case 'tool.call.started':
    case 'tool.call.approvalRequested':
    case 'tool.call.approvalResolved':
    case 'tool.call.completed':
    case 'tool.call.failed':
      return {
        ...base,
        chat: pickChatRuntimeFields(chat)
      };
    default:
      return undefined;
  }
}

function pickChatRuntimeFields(chat: Chat): NonNullable<ChatPatchMessage['chat']> {
  return {
    busy: chat.busy,
    activity: chat.activity,
    activityDetail: chat.activityDetail,
    modelRequest: chat.modelRequest,
    lastAnswer: chat.lastAnswer,
    usage: chat.usage,
    context: chat.context,
    contextLength: chat.contextLength,
    activePlan: chat.activePlan,
    reflectionCandidates: chat.reflectionCandidates,
    updatedAt: chat.updatedAt
  };
}
