import type { AgentRuntimeChatRepository } from '../../../../core/app/runtime/agentRuntime';
import type {
  Chat,
  ChatMessage,
  ChatModelSettings,
  ChatPlan,
  ChatUsageEstimate
} from '../../../../core/shared/types/types';

export function createInMemoryIsolationChatRepository({
  chatId,
  title,
  model,
  modelSettings,
  now,
  idFactory
}: {
  chatId: string;
  title: string;
  model: string;
  modelSettings: ChatModelSettings;
  now: () => number;
  idFactory: () => string;
}): { repository: AgentRuntimeChatRepository; getChat(): Chat } {
  const chat: Chat = {
    id: chatId,
    title,
    model,
    modelSettings,
    messages: [],
    history: [],
    lastAnswer: '',
    busy: false,
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    createdAt: now(),
    updatedAt: now()
  };

  const repository: AgentRuntimeChatRepository = {
    getChat: () => chat,
    appendMessage: (_chatId, message) => {
      const next: ChatMessage = { ...message, id: idFactory(), createdAt: now() };
      chat.messages.push(next);
      chat.updatedAt = next.createdAt;
      return next;
    },
    updateMessage: (_chatId, messageId, patch) => {
      const index = chat.messages.findIndex((message) => message.id === messageId);
      if (index === -1) {
        throw new Error(`Message not found: ${messageId}`);
      }
      chat.messages[index] = { ...chat.messages[index], ...patch };
      chat.updatedAt = now();
      return chat.messages[index];
    },
    setBusy: (_chatId, busy) => {
      chat.busy = busy;
      chat.updatedAt = now();
    },
    setActivity: (_chatId, activity, detail) => {
      chat.activity = activity;
      chat.activityDetail = detail;
      chat.updatedAt = now();
    },
    setActivityDetail: (_chatId, detail) => {
      chat.activityDetail = detail;
      chat.updatedAt = now();
    },
    setModelRequest: (_chatId, modelRequest) => {
      chat.modelRequest = modelRequest;
      chat.updatedAt = now();
    },
    updateModelRequest: (_chatId, patch) => {
      chat.modelRequest = chat.modelRequest ? { ...chat.modelRequest, ...patch } : undefined;
      chat.updatedAt = now();
      return chat.modelRequest;
    },
    setHistory: (_chatId, history) => {
      chat.history = history;
      chat.updatedAt = now();
    },
    setLastAnswer: (_chatId, answer) => {
      chat.lastAnswer = answer;
      chat.updatedAt = now();
    },
    addUsage: (_chatId, usage) => {
      chat.usage = addUsage(chat.usage, usage);
      chat.updatedAt = now();
      return chat.usage;
    },
    setContext: (_chatId, context) => {
      chat.context = context;
      chat.contextLength = context?.tokens;
      chat.updatedAt = now();
    },
    getActivePlan: () => chat.activePlan,
    setActivePlan: (_chatId, activePlan: ChatPlan) => {
      chat.activePlan = activePlan;
      chat.updatedAt = now();
    },
    addReflectionCandidates: (_chatId, candidates) => {
      chat.reflectionCandidates = [...(chat.reflectionCandidates || []), ...candidates];
      chat.updatedAt = now();
    }
  };

  return { repository, getChat: () => chat };
}

function addUsage(current: ChatUsageEstimate, patch: Partial<ChatUsageEstimate>): ChatUsageEstimate {
  return {
    promptTokens: current.promptTokens + (patch.promptTokens || 0),
    completionTokens: current.completionTokens + (patch.completionTokens || 0),
    totalTokens: current.totalTokens + (patch.totalTokens || 0)
  };
}
