import * as vscode from 'vscode';

import type { DaemonChat } from '../../../cli/daemonProtocol';
import type { AgentChatStore } from '../../chats/chatDataStore';
import type {
  AgentReflectionCandidate,
  AgentReflectionCandidateStatus,
  Chat,
  ChatContextEstimate,
  ChatMessage,
  ChatModelSettings,
  ChatSummary,
  ChatUsageEstimate
} from '../../chats/types';
import { addReflectionCandidates } from './chatStore/addReflectionCandidates';
import { addUsage } from './chatStore/addUsage';
import { appendLocalMessage } from './chatStore/appendLocalMessage';
import { clearLocalChat } from './chatStore/clearLocalChat';
import { compactLocalChat } from './chatStore/compactLocalChat';
import { createLocalChat } from './chatStore/createLocalChat';
import { deleteLocalChat } from './chatStore/deleteLocalChat';
import { duplicateLocalChat } from './chatStore/duplicateLocalChat';
import { getActiveChat } from './chatStore/getActiveChat';
import { getChatSummaries } from './chatStore/getChatSummaries';
import { replaceAllChats } from './chatStore/replaceAllChats';
import { requireChat } from './chatStore/requireChat';
import { setActiveLocalChat } from './chatStore/setActiveChat';
import { setActivePlan } from './chatStore/setActivePlan';
import { setActivity } from './chatStore/setActivity';
import { setActivityDetail } from './chatStore/setActivityDetail';
import { setBusy } from './chatStore/setBusy';
import { setContext } from './chatStore/setContext';
import { setHistory } from './chatStore/setHistory';
import { setLastAnswer } from './chatStore/setLastAnswer';
import { setModel } from './chatStore/setModel';
import { setModelRequest } from './chatStore/setModelRequest';
import { setModelSettings } from './chatStore/setModelSettings';
import { setReflectionCandidateStatus } from './chatStore/setReflectionCandidateStatus';
import { setVcsState } from './chatStore/setVcsState';
import type { DaemonChatStoreState } from './chatStore/types';
import { updateLocalMessage } from './chatStore/updateLocalMessage';
import { updateModelRequest } from './chatStore/updateModelRequest';
import { upsertChat } from './chatStore/upsertChat';

/**
 * Что это: синхронный extension-store, который адаптирует daemon chats для webview.
 * Зачем нужно: webview-компоненты работают с прежним AgentChatStore API, а daemon остаётся source of truth.
 * Какую продуктовую проблему решает: экран чата быстро реагирует на локальные действия и безопасно синхронизируется с daemon.
 */
export class DaemonChatStore implements AgentChatStore {
  private readonly state: DaemonChatStoreState = {
    chats: new Map<string, Chat>(),
    changedEmitter: new vscode.EventEmitter<void>(),
    activeChatId: undefined
  };

  readonly onDidChange = this.state.changedEmitter.event;

  /** Полностью заменяет локальные чаты snapshot-ом daemon. */
  replaceAll(chats: readonly DaemonChat[], activeChatId?: string): void {
    replaceAllChats({ state: this.state, chats, activeChatId });
  }

  /** Обновляет один чат из daemon payload. */
  upsert(chat: DaemonChat): Chat {
    return upsertChat({ state: this.state, chat });
  }

  /** Создаёт локальный новый чат. */
  createChat(settings?: string | ChatModelSettings): Chat {
    return createLocalChat({ state: this.state, settings });
  }

  /** Создаёт compacted-копию чата с summary и tail. */
  compactChat(chatId: string, summary: string, tail?: { messages?: ChatMessage[]; history?: Chat['history'] }): Chat {
    return compactLocalChat({ state: this.state, chatId, summary, tail });
  }

  /** Создаёт независимую копию чата. */
  duplicateChat(chatId: string): Chat {
    return duplicateLocalChat({ state: this.state, chatId });
  }

  /** Удаляет чат и выбирает новый активный чат. */
  deleteChat(chatId: string, fallbackModel?: string): Chat {
    return deleteLocalChat({ state: this.state, chatId, fallbackModel });
  }

  /** Возвращает активный чат с fallback-созданием. */
  getActiveChat(): Chat {
    return getActiveChat({ state: this.state });
  }

  /** Возвращает чат по id без сайд-эффектов. */
  getChat(chatId: string): Chat | undefined {
    return this.state.chats.get(chatId);
  }

  /** Делает чат активным. */
  setActiveChat(chatId: string): Chat {
    return setActiveLocalChat({ state: this.state, chatId });
  }

  /** Возвращает lightweight summaries для списка чатов. */
  getSummaries(): ChatSummary[] {
    return getChatSummaries({ state: this.state });
  }

  /** Добавляет локальное сообщение. */
  appendMessage(chatId: string, message: Omit<ChatMessage, 'id' | 'createdAt'>): ChatMessage {
    return appendLocalMessage({ state: this.state, chatId, message });
  }

  /** Обновляет локальное сообщение. */
  updateMessage(chatId: string, messageId: string, patch: Partial<Omit<ChatMessage, 'id' | 'createdAt'>>): ChatMessage {
    return updateLocalMessage({ state: this.state, chatId, messageId, patch });
  }

  /** Очищает локальный чат. */
  clearChat(chatId: string): void {
    clearLocalChat({ state: this.state, chatId });
  }

  /** Меняет модель чата. */
  setModel(chatId: string, model: string): void {
    setModel({ state: this.state, chatId, model });
  }

  /** Меняет настройки модели чата. */
  setModelSettings(chatId: string, settings: Partial<ChatModelSettings>): void {
    setModelSettings({ state: this.state, chatId, settings });
  }

  /** Сохраняет VCS-состояние чата. */
  setVcsState(chatId: string, vcs: Chat['vcs']): void {
    setVcsState({ state: this.state, chatId, vcs });
  }

  /** Меняет busy-флаг. */
  setBusy(chatId: string, busy: boolean): void {
    setBusy({ state: this.state, chatId, busy });
  }

  /** Обновляет последний ответ ассистента. */
  setLastAnswer(chatId: string, answer: string): void {
    setLastAnswer({ state: this.state, chatId, answer });
  }

  /** Заменяет model history. */
  setHistory(chatId: string, history: Chat['history']): void {
    setHistory({ state: this.state, chatId, history });
  }

  /** Добавляет usage к чату. */
  addUsage(chatId: string, usage: Partial<ChatUsageEstimate>): ChatUsageEstimate {
    return addUsage({ state: this.state, chatId, usage });
  }

  /** Сохраняет оценку контекста. */
  setContext(chatId: string, context: ChatContextEstimate | undefined): void {
    setContext({ state: this.state, chatId, context });
  }

  /** Сохраняет активный план агента. */
  setActivePlan(chatId: string, activePlan: Chat['activePlan']): void {
    setActivePlan({ state: this.state, chatId, activePlan });
  }

  /** Добавляет предложения памяти. */
  addReflectionCandidates(chatId: string, candidates: AgentReflectionCandidate[]): void {
    addReflectionCandidates({ state: this.state, chatId, candidates });
  }

  /** Меняет статус предложения памяти. */
  setReflectionCandidateStatus(
    chatId: string,
    candidateId: string,
    status: AgentReflectionCandidateStatus
  ): AgentReflectionCandidate | undefined {
    return setReflectionCandidateStatus({ state: this.state, chatId, candidateId, status });
  }

  /** Меняет activity и detail. */
  setActivity(chatId: string, activity: Chat['activity'], detail?: string): void {
    setActivity({ state: this.state, chatId, activity, detail });
  }

  /** Меняет только detail текущей activity. */
  setActivityDetail(chatId: string, detail: string | undefined): void {
    setActivityDetail({ state: this.state, chatId, detail });
  }

  /** Устанавливает полный model request status. */
  setModelRequest(chatId: string, modelRequest: Chat['modelRequest']): void {
    setModelRequest({ state: this.state, chatId, modelRequest });
  }

  /** Частично обновляет текущий model request status. */
  updateModelRequest(
    chatId: string,
    patch: Partial<NonNullable<Chat['modelRequest']>>
  ): Chat['modelRequest'] | undefined {
    return updateModelRequest({ state: this.state, chatId, patch });
  }

  /** Проверяет наличие чата для старых callers, которым нужен явный error path. */
  private requireChat(chatId: string): Chat {
    return requireChat({ state: this.state, chatId });
  }
}
