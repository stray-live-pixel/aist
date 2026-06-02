import { randomUUID } from 'node:crypto';

import type {
  AgentReflectionCandidate,
  AgentReflectionCandidateStatus,
  Chat,
  ChatContextEstimate,
  ChatMessage,
  ChatModelRequestStatus,
  ChatPlan,
  ChatSummary,
  ChatUsageEstimate,
  OpenRouterMessage
} from '../../shared/types/types';
import { globalWorkspaceChatsDir } from '../storage/storage';
import type { ChatMessageInput } from './chatRepository/ChatMessageInput';
import type { ChatMetadataPatch } from './chatRepository/ChatMetadataPatch';
import type { ChatRepositoryContext } from './chatRepository/ChatRepositoryContext';
import type { ChatRepositoryOptions } from './chatRepository/ChatRepositoryOptions';
import type { ChatStatePatch } from './chatRepository/ChatStatePatch';
import type { CreateChatInput } from './chatRepository/CreateChatInput';
import { addChatUsage } from './chatRepository/addChatUsage';
import { addReflectionCandidates } from './chatRepository/addReflectionCandidates';
import { appendChatHistory } from './chatRepository/appendChatHistory';
import { appendChatHistoryBatch } from './chatRepository/appendChatHistoryBatch';
import { appendChatMessage } from './chatRepository/appendChatMessage';
import { clearChat } from './chatRepository/clearChat';
import { createChat } from './chatRepository/createChat';
import { deleteChat } from './chatRepository/deleteChat';
import { getChat } from './chatRepository/getChat';
import { listChats } from './chatRepository/listChats';
import { rebuildChatIndex } from './chatRepository/rebuildChatIndex';
import { setChatHistory } from './chatRepository/setChatHistory';
import { setReflectionCandidateStatus } from './chatRepository/setReflectionCandidateStatus';
import { updateChatMessage } from './chatRepository/updateChatMessage';
import { updateChatMetadata } from './chatRepository/updateChatMetadata';
import { updateChatModelRequest } from './chatRepository/updateChatModelRequest';
import { updateChatState } from './chatRepository/updateChatState';

export type { ChatMessageInput, ChatMetadataPatch, ChatRepositoryOptions, ChatStatePatch, CreateChatInput };

/**
 * Что это: файловый источник правды для CLI-чатов.
 * Зачем нужно: публичный фасад сохраняет прежний API, а сценарии записи вынесены в маленькие файлы.
 * Какую продуктовую проблему решает: история, state, model history и индекс чатов остаются консистентными и поддерживаемыми.
 */
export class ChatRepository {
  readonly rootPath: string;
  private readonly idFactory: () => string;
  private readonly now: () => number;

  /** Создаёт репозиторий для конкретного workspace и homeDir. */
  constructor(options: ChatRepositoryOptions) {
    this.rootPath = globalWorkspaceChatsDir(options.workspaceRoot, options.homeDir);
    this.idFactory = options.idFactory || randomUUID;
    this.now = options.now || Date.now;
  }

  /** Создаёт новый чат и стартовые storage-файлы. */
  create(input: CreateChatInput): Promise<Chat> {
    return createChat({ context: this.context(), input });
  }

  /** Возвращает summaries для списка чатов. */
  list(): Promise<ChatSummary[]> {
    return listChats({ context: this.context() });
  }

  /** Возвращает полный чат или undefined, если чат отсутствует. */
  get(chatId: string): Promise<Chat | undefined> {
    return getChat({ context: this.context(), chatId });
  }

  /** Обновляет persisted-метаданные чата. */
  update(chatId: string, patch: ChatMetadataPatch): Promise<Chat> {
    return updateChatMetadata({ context: this.context(), chatId, patch });
  }

  /** Очищает сообщения, историю модели и transient-state чата. */
  clear(chatId: string): Promise<Chat> {
    return clearChat({ context: this.context(), chatId });
  }

  /** Удаляет чат из файлового хранилища. */
  delete(chatId: string): Promise<void> {
    return deleteChat({ context: this.context(), chatId });
  }

  /** Обновляет runtime-state чата. */
  updateState(chatId: string, patch: ChatStatePatch): Promise<Chat> {
    return updateChatState({ context: this.context(), chatId, patch });
  }

  /** Устанавливает busy-флаг выполнения агента. */
  setBusy(chatId: string, busy: boolean): Promise<void> {
    return this.updateState(chatId, { busy }).then(() => undefined);
  }

  /** Устанавливает activity и человекочитаемую деталь статуса. */
  setActivity(chatId: string, activity: Chat['activity'], detail?: string): Promise<void> {
    return this.updateState(chatId, { activity, activityDetail: detail }).then(() => undefined);
  }

  /** Обновляет только detail текущего статуса агента. */
  setActivityDetail(chatId: string, detail: string | undefined): Promise<void> {
    return this.updateState(chatId, { activityDetail: detail }).then(() => undefined);
  }

  /** Устанавливает полный статус model request. */
  setModelRequest(chatId: string, modelRequest: ChatModelRequestStatus | undefined): Promise<void> {
    return this.updateState(chatId, { modelRequest }).then(() => undefined);
  }

  /** Частично обновляет текущий model request, если он есть. */
  updateModelRequest(
    chatId: string,
    patch: Partial<NonNullable<Chat['modelRequest']>>
  ): Promise<ChatModelRequestStatus | undefined> {
    return updateChatModelRequest({ context: this.context(), chatId, patch });
  }

  /** Сохраняет оценку контекста и синхронный contextLength. */
  setContext(chatId: string, context: ChatContextEstimate | undefined): Promise<void> {
    return this.updateState(chatId, { context, contextLength: context?.tokens }).then(() => undefined);
  }

  /** Сохраняет активный план агента для виджета прогресса. */
  setActivePlan(chatId: string, activePlan: ChatPlan | undefined): Promise<void> {
    return this.updateState(chatId, { activePlan }).then(() => undefined);
  }

  /** Добавляет предложения памяти от reflection-субагента. */
  addReflectionCandidates(chatId: string, candidates: AgentReflectionCandidate[]): Promise<void> {
    return addReflectionCandidates({ context: this.context(), chatId, candidates });
  }

  /** Сохраняет статус обработки предложения памяти. */
  setReflectionCandidateStatus(
    chatId: string,
    candidateId: string,
    status: AgentReflectionCandidateStatus
  ): Promise<AgentReflectionCandidate | undefined> {
    return setReflectionCandidateStatus({ context: this.context(), chatId, candidateId, status });
  }

  /** Добавляет новое UI-сообщение в чат. */
  appendMessage(chatId: string, message: ChatMessageInput): Promise<ChatMessage> {
    return appendChatMessage({ context: this.context(), chatId, message });
  }

  /** Обновляет существующее UI-сообщение по id. */
  updateMessage(
    chatId: string,
    messageId: string,
    patch: Partial<Omit<ChatMessage, 'id' | 'createdAt'>>
  ): Promise<ChatMessage> {
    return updateChatMessage({ context: this.context(), chatId, messageId, patch });
  }

  /** Добавляет одно сообщение в model history. */
  appendHistory(chatId: string, message: OpenRouterMessage): Promise<void> {
    return appendChatHistory({ context: this.context(), chatId, message });
  }

  /** Добавляет несколько сообщений в model history. */
  appendHistoryBatch(chatId: string, messages: OpenRouterMessage[]): Promise<void> {
    return appendChatHistoryBatch({ context: this.context(), chatId, messages });
  }

  /** Полностью заменяет model history после compaction. */
  setHistory(chatId: string, history: OpenRouterMessage[]): Promise<void> {
    return setChatHistory({ context: this.context(), chatId, history });
  }

  /** Обновляет последний ответ ассистента в метаданных. */
  setLastAnswer(chatId: string, answer: string): Promise<void> {
    return this.update(chatId, { lastAnswer: answer }).then(() => undefined);
  }

  /** Накопительно добавляет usage модели к чату. */
  addUsage(chatId: string, usage: Partial<ChatUsageEstimate>): Promise<ChatUsageEstimate> {
    return addChatUsage({ context: this.context(), chatId, usage });
  }

  /** Пересобирает индекс чатов из файлового источника правды. */
  rebuildIndex(): Promise<ChatSummary[]> {
    return rebuildChatIndex({ context: this.context() });
  }

  /** Собирает контекст для сценарных функций без раскрытия private-полей наружу. */
  private context(): ChatRepositoryContext {
    return { rootPath: this.rootPath, idFactory: this.idFactory, now: this.now };
  }
}
