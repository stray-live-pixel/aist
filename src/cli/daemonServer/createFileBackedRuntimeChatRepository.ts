import type { AgentRuntimeChatRepository } from '../../core/app/runtime/agentRuntime';
import { ChatRepository } from '../../core/entities/chat/chatRepository';
import type { Chat } from '../../core/shared/types/types';

/**
 * Что это: adapter persisted ChatRepository для AgentRuntimeService.
 * Зачем нужно: runtime работает с минимальным chat API, а daemon хранит чаты в файловом repository.
 * Какую продуктовую проблему решает: agent loop можно тестировать и запускать без знания CLI storage деталей.
 */
export function createFileBackedRuntimeChatRepository({
  repository
}: {
  repository: ChatRepository;
}): AgentRuntimeChatRepository {
  const activePlans = new Map<string, Chat['activePlan']>();

  return {
    getChat: async (chatId) => {
      const chat = await repository.get(chatId);
      activePlans.set(chatId, chat?.activePlan);
      return chat;
    },
    appendMessage: (chatId, message) => repository.appendMessage(chatId, message),
    updateMessage: (chatId, messageId, patch) => repository.updateMessage(chatId, messageId, patch),
    setBusy: (chatId, busy) => repository.setBusy(chatId, busy),
    setActivity: (chatId, activity, detail) => repository.setActivity(chatId, activity, detail),
    setActivityDetail: (chatId, detail) => repository.setActivityDetail(chatId, detail),
    setModelRequest: (chatId, modelRequest) => repository.setModelRequest(chatId, modelRequest),
    updateModelRequest: (chatId, patch) => repository.updateModelRequest(chatId, patch),
    setHistory: (chatId, history) => repository.setHistory(chatId, history),
    setLastAnswer: (chatId, answer) => repository.setLastAnswer(chatId, answer),
    addUsage: (chatId, usage) => repository.addUsage(chatId, usage),
    setContext: (chatId, context) => repository.setContext(chatId, context),
    getActivePlan: (chatId) => activePlans.get(chatId),
    setActivePlan: async (chatId, activePlan) => {
      activePlans.set(chatId, activePlan);
      await repository.setActivePlan(chatId, activePlan);
    },
    addReflectionCandidates: (chatId, candidates) => repository.addReflectionCandidates(chatId, candidates)
  };
}
