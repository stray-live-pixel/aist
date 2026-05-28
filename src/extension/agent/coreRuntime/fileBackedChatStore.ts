import { randomUUID } from 'node:crypto';
import * as vscode from 'vscode';

import { ChatRepository } from '../../../core/chatRepository';
import type { AgentChatStore } from '../../chats/chatDataStore';
import type {
  AgentReflectionCandidate,
  AgentReflectionCandidateStatus,
  Chat,
  ChatContextEstimate,
  ChatMessage,
  ChatSummary,
  ChatUsageEstimate
} from '../../chats/types';
import { DEFAULT_MODEL } from '../../shared/constants';
import type { AistLogger } from '../../shared/logger';

const EMPTY_USAGE: ChatUsageEstimate = {
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0
};

export type FileBackedChatStoreOptions = {
  repository: ChatRepository;
  defaultModel?: string;
  activeChatId?: string;
  saveActiveChatId?: (chatId: string | undefined) => Thenable<void> | Promise<void>;
  logger?: Pick<AistLogger, 'error'>;
};

/**
 * Cache-backed facade over core ChatRepository.
 *
 * Existing VS Code UI code reads chat state synchronously, while the new storage
 * backend is async file IO. This adapter updates the in-memory projection first
 * and serializes repository writes through a queue so the webview keeps its
 * current state shape during the migration bridge.
 */
export class FileBackedChatStore implements AgentChatStore {
  private readonly chats = new Map<string, Chat>();
  private readonly changedEmitter = new vscode.EventEmitter<void>();
  private pendingWrite = Promise.resolve();
  private activeChatId: string | undefined;

  readonly onDidChange = this.changedEmitter.event;

  constructor(private readonly options: FileBackedChatStoreOptions) {
    this.activeChatId = options.activeChatId;
  }

  async load(): Promise<void> {
    const summaries = await this.options.repository.list();
    for (const summary of summaries) {
      const chat = await this.options.repository.get(summary.id);
      if (chat) {
        this.chats.set(chat.id, this.normalizeLoadedChat(chat));
      }
    }

    if (!this.chats.size) {
      this.createChat(this.options.defaultModel || DEFAULT_MODEL);
      await this.flushPendingWrites();
      return;
    }

    if (!this.activeChatId || !this.chats.has(this.activeChatId)) {
      this.activeChatId = this.getSortedChats()[0]?.id;
      this.saveActiveChatId();
    }
  }

  async flushPendingWrites(): Promise<void> {
    await this.pendingWrite;
  }

  createChat(model: string = DEFAULT_MODEL): Chat {
    const now = Date.now();
    const chat: Chat = {
      id: randomUUID(),
      title: this.getDefaultChatTitle(),
      model,
      messages: [],
      history: [],
      lastAnswer: '',
      activity: undefined,
      busy: false,
      usage: { ...EMPTY_USAGE },
      createdAt: now,
      updatedAt: now
    };

    this.chats.set(chat.id, chat);
    this.activeChatId = chat.id;
    this.enqueueWrite('create chat', () =>
      this.options.repository.create({
        id: chat.id,
        title: chat.title,
        model: chat.model,
        lastAnswer: chat.lastAnswer,
        usage: chat.usage,
        state: { busy: false }
      })
    );
    this.fireChanged();
    return chat;
  }

  compactChat(
    chatId: string,
    summary: string,
    tail: { messages?: ChatMessage[]; history?: Chat['history'] } = {}
  ): Chat {
    const source = this.requireChat(chatId);
    if (source.busy) {
      throw new Error('Cannot compact a chat while it is running.');
    }

    const now = Date.now();
    const summaryMessage: ChatMessage = {
      id: randomUUID(),
      role: 'assistant',
      content: summary,
      createdAt: now
    };
    const chat: Chat = {
      id: randomUUID(),
      title: `${source.title} compacted`,
      model: source.model,
      previousChatId: source.id,
      compactedAt: now,
      messages: [summaryMessage, ...(tail.messages || []).map((message) => cloneMessage(message))],
      history: [{ role: 'assistant', content: summary }, ...clonePlain(tail.history || [])],
      lastAnswer: summary,
      activity: undefined,
      busy: false,
      usage: { ...EMPTY_USAGE },
      createdAt: now,
      updatedAt: now
    };

    this.chats.set(chat.id, chat);
    this.activeChatId = chat.id;
    this.enqueueWrite('compact chat', () =>
      this.options.repository.create({
        id: chat.id,
        title: chat.title,
        model: chat.model,
        previousChatId: chat.previousChatId,
        compactedAt: chat.compactedAt,
        lastAnswer: chat.lastAnswer,
        usage: chat.usage,
        messages: chat.messages,
        history: chat.history,
        state: { busy: false }
      })
    );
    this.fireChanged();
    return chat;
  }

  duplicateChat(chatId: string): Chat {
    const source = this.requireChat(chatId);
    const now = Date.now();
    const chat: Chat = {
      id: randomUUID(),
      title: this.getDuplicateTitle(source.title),
      model: source.model,
      previousChatId: source.previousChatId,
      compactedAt: source.compactedAt,
      messages: source.messages.map((message) => cloneMessage(message)),
      history: clonePlain(source.history),
      lastAnswer: source.lastAnswer,
      activePlan: source.activePlan ? clonePlain(source.activePlan) : undefined,
      reflectionCandidates: (source.reflectionCandidates || []).map((candidate) => clonePlain(candidate)),
      activity: undefined,
      busy: false,
      usage: normalizeUsage(source.usage),
      createdAt: now,
      updatedAt: now
    };

    this.chats.set(chat.id, chat);
    this.activeChatId = chat.id;
    this.enqueueWrite('duplicate chat', () =>
      this.options.repository.create({
        id: chat.id,
        title: chat.title,
        model: chat.model,
        previousChatId: chat.previousChatId,
        compactedAt: chat.compactedAt,
        lastAnswer: chat.lastAnswer,
        usage: chat.usage,
        messages: chat.messages,
        history: chat.history,
        state: {
          activePlan: chat.activePlan,
          reflectionCandidates: chat.reflectionCandidates,
          busy: false
        }
      })
    );
    this.fireChanged();
    return chat;
  }

  deleteChat(chatId: string, fallbackModel: string = DEFAULT_MODEL): Chat {
    const chat = this.requireChat(chatId);
    if (chat.busy) {
      throw new Error('Cannot delete a chat while it is running.');
    }

    this.chats.delete(chatId);
    this.enqueueWrite('delete chat', () => this.options.repository.delete(chatId));

    if (!this.chats.size) {
      return this.createChat(fallbackModel);
    }

    if (this.activeChatId === chatId || !this.activeChatId || !this.chats.has(this.activeChatId)) {
      this.activeChatId = this.getSortedChats()[0].id;
    }

    const activeChat = this.getActiveChat();
    this.fireChanged();
    return activeChat;
  }

  getActiveChat(): Chat {
    if (!this.activeChatId || !this.chats.has(this.activeChatId)) {
      return this.createChat(this.options.defaultModel || DEFAULT_MODEL);
    }

    return this.chats.get(this.activeChatId)!;
  }

  getChat(chatId: string): Chat | undefined {
    return this.chats.get(chatId);
  }

  setActiveChat(chatId: string): Chat {
    const chat = this.requireChat(chatId);
    this.activeChatId = chatId;
    this.touch(chat);
    return chat;
  }

  getSummaries(): ChatSummary[] {
    return this.getSortedChats().map((chat) => ({
      id: chat.id,
      title: getChatTitle(chat),
      model: chat.model,
      previousChatId: chat.previousChatId,
      compactedAt: chat.compactedAt,
      messageCount: chat.messages.filter((message) => message.role === 'user' || message.role === 'assistant').length,
      lastUserMessage: getLastUserMessage(chat),
      busy: chat.busy,
      lastMessageAt: getLastMessageAt(chat),
      updatedAt: chat.updatedAt
    }));
  }

  appendMessage(chatId: string, message: Omit<ChatMessage, 'id' | 'createdAt'>): ChatMessage {
    const chat = this.requireChat(chatId);
    const nextMessage: ChatMessage = {
      id: randomUUID(),
      createdAt: Date.now(),
      ...message
    };

    chat.messages.push(nextMessage);

    if (message.role === 'user' && message.content && chat.title === 'New chat') {
      chat.title = toSingleLinePreview(message.content, 50) || chat.title;
      this.enqueueWrite('update chat title', () => this.options.repository.update(chat.id, { title: chat.title }));
    }

    this.enqueueWrite('append chat message', () => this.options.repository.appendMessage(chatId, nextMessage));
    this.touch(chat);
    return nextMessage;
  }

  updateMessage(chatId: string, messageId: string, patch: Partial<Omit<ChatMessage, 'id' | 'createdAt'>>): ChatMessage {
    const chat = this.requireChat(chatId);
    const message = chat.messages.find((item) => item.id === messageId);
    if (!message) {
      throw new Error(`Message not found: ${messageId}`);
    }

    Object.assign(message, patch);
    this.enqueueWrite('update chat message', () => this.options.repository.updateMessage(chatId, messageId, patch));
    this.touch(chat);
    return message;
  }

  clearChat(chatId: string): void {
    const chat = this.requireChat(chatId);
    chat.messages = [];
    chat.history = [];
    chat.lastAnswer = '';
    chat.activity = undefined;
    chat.activityDetail = undefined;
    chat.modelRequest = undefined;
    chat.busy = false;
    chat.context = undefined;
    chat.contextLength = undefined;
    chat.activePlan = undefined;
    chat.reflectionCandidates = [];
    chat.usage = { ...EMPTY_USAGE };
    chat.title = 'New chat';
    this.enqueueWrite('clear chat', () => this.options.repository.clear(chatId));
    this.touch(chat);
  }

  setModel(chatId: string, model: string): void {
    const chat = this.requireChat(chatId);
    chat.model = model;
    this.enqueueWrite('set chat model', () => this.options.repository.update(chatId, { model }));
    this.touch(chat);
  }

  setBusy(chatId: string, busy: boolean): void {
    const chat = this.requireChat(chatId);
    chat.busy = busy;
    this.enqueueWrite('set chat busy', () => this.options.repository.setBusy(chatId, busy));
    this.touch(chat);
  }

  setLastAnswer(chatId: string, answer: string): void {
    const chat = this.requireChat(chatId);
    chat.lastAnswer = answer;
    this.enqueueWrite('set chat last answer', () => this.options.repository.setLastAnswer(chatId, answer));
    this.touch(chat);
  }

  setHistory(chatId: string, history: Chat['history']): void {
    const chat = this.requireChat(chatId);
    chat.history = history;
    this.enqueueWrite('set chat history', () => this.options.repository.setHistory(chatId, history));
    this.touch(chat);
  }

  addUsage(chatId: string, usage: Partial<ChatUsageEstimate>): ChatUsageEstimate {
    const chat = this.requireChat(chatId);
    const current = normalizeUsage(chat.usage);
    const nextCost =
      current.costUsd === undefined && usage.costUsd === undefined
        ? undefined
        : (current.costUsd || 0) + (usage.costUsd || 0);
    const next: ChatUsageEstimate = {
      promptTokens: current.promptTokens + (usage.promptTokens || 0),
      completionTokens: current.completionTokens + (usage.completionTokens || 0),
      totalTokens: current.totalTokens + (usage.totalTokens || 0),
      costUsd: nextCost
    };

    chat.usage = next;
    this.enqueueWrite('add chat usage', () => this.options.repository.update(chatId, { usage: next }));
    this.touch(chat);
    return next;
  }

  setContext(chatId: string, context: ChatContextEstimate | undefined): void {
    const chat = this.requireChat(chatId);
    chat.context = context;
    chat.contextLength = context?.tokens;
    this.enqueueWrite('set chat context', () => this.options.repository.setContext(chatId, context));
    this.touch(chat);
  }

  setActivePlan(chatId: string, activePlan: Chat['activePlan']): void {
    const chat = this.requireChat(chatId);
    chat.activePlan = activePlan;
    this.enqueueWrite('set active plan', () => this.options.repository.setActivePlan(chatId, activePlan));
    this.touch(chat);
  }

  addReflectionCandidates(chatId: string, candidates: AgentReflectionCandidate[]): void {
    if (!candidates.length) {
      return;
    }

    const chat = this.requireChat(chatId);
    const current = chat.reflectionCandidates || [];
    const existingKeys = new Set(current.map((candidate) => getReflectionCandidateKey(candidate)));
    const nextCandidates = candidates.filter((candidate) => {
      const key = getReflectionCandidateKey(candidate);
      if (existingKeys.has(key)) {
        return false;
      }
      existingKeys.add(key);
      return true;
    });

    if (!nextCandidates.length) {
      return;
    }

    chat.reflectionCandidates = [...current, ...nextCandidates];
    this.enqueueWrite('add reflection candidates', () =>
      this.options.repository.addReflectionCandidates(chatId, nextCandidates)
    );
    this.touch(chat);
  }

  setReflectionCandidateStatus(
    chatId: string,
    candidateId: string,
    status: AgentReflectionCandidateStatus
  ): AgentReflectionCandidate | undefined {
    const chat = this.requireChat(chatId);
    const candidates = chat.reflectionCandidates || [];
    const candidate = candidates.find((item) => item.id === candidateId);
    if (!candidate) {
      return undefined;
    }

    candidate.status = status;
    chat.reflectionCandidates = candidates;
    this.enqueueWrite('set reflection candidate status', () =>
      this.options.repository.updateState(chatId, { reflectionCandidates: candidates })
    );
    this.touch(chat);
    return candidate;
  }

  setActivity(chatId: string, activity: Chat['activity'], detail?: string): void {
    const chat = this.requireChat(chatId);
    chat.activity = activity;
    chat.activityDetail = detail;
    this.enqueueWrite('set chat activity', () => this.options.repository.setActivity(chatId, activity, detail));
    this.touch(chat);
  }

  setActivityDetail(chatId: string, detail: string | undefined): void {
    const chat = this.requireChat(chatId);
    chat.activityDetail = detail;
    this.enqueueWrite('set chat activity detail', () => this.options.repository.setActivityDetail(chatId, detail));
    this.touch(chat);
  }

  setModelRequest(chatId: string, modelRequest: Chat['modelRequest']): void {
    const chat = this.requireChat(chatId);
    chat.modelRequest = modelRequest;
    this.enqueueWrite('set model request', () => this.options.repository.setModelRequest(chatId, modelRequest));
    this.touch(chat);
  }

  updateModelRequest(
    chatId: string,
    patch: Partial<NonNullable<Chat['modelRequest']>>
  ): Chat['modelRequest'] | undefined {
    const chat = this.requireChat(chatId);
    if (!chat.modelRequest) {
      return undefined;
    }

    chat.modelRequest = { ...chat.modelRequest, ...patch };
    this.enqueueWrite('update model request', () => this.options.repository.updateModelRequest(chatId, patch));
    this.touch(chat);
    return chat.modelRequest;
  }

  private requireChat(chatId: string): Chat {
    const chat = this.chats.get(chatId);
    if (!chat) {
      throw new Error(`Chat not found: ${chatId}`);
    }

    return chat;
  }

  private getSortedChats(): Chat[] {
    return [...this.chats.values()].sort((a, b) => {
      const byLastMessage = getLastMessageAt(b) - getLastMessageAt(a);
      return byLastMessage || b.createdAt - a.createdAt;
    });
  }

  private touch(chat: Chat): void {
    chat.updatedAt = Date.now();
    this.fireChanged();
  }

  private fireChanged(): void {
    this.saveActiveChatId();
    this.changedEmitter.fire();
  }

  private saveActiveChatId(): void {
    if (!this.options.saveActiveChatId) {
      return;
    }

    void this.options.saveActiveChatId(this.activeChatId).then(
      () => undefined,
      (error) => this.options.logger?.error('Failed to save active file-backed chat id', error)
    );
  }

  private enqueueWrite(label: string, write: () => Promise<unknown>): void {
    this.pendingWrite = this.pendingWrite.then(write, write).then(
      () => undefined,
      (error) => {
        this.options.logger?.error(`Failed to persist file-backed chat store operation: ${label}`, error);
      }
    );
  }

  private normalizeLoadedChat(chat: Chat): Chat {
    const next = clonePlain(chat);
    const stateChanged = Boolean(next.busy || next.activity || next.activityDetail || next.modelRequest);
    next.busy = false;
    next.activity = undefined;
    next.activityDetail = undefined;
    next.modelRequest = undefined;
    next.usage = normalizeUsage(next.usage);
    next.reflectionCandidates = next.reflectionCandidates || [];

    if (stateChanged) {
      this.enqueueWrite('reset loaded chat state', () =>
        this.options.repository.updateState(next.id, {
          busy: false,
          activity: undefined,
          activityDetail: undefined,
          modelRequest: undefined
        })
      );
    }

    for (const message of next.messages) {
      if (message.role === 'tool' && (message.status === 'waiting' || message.status === 'running')) {
        message.status = 'error';
        message.approval = message.approval === 'pending' ? 'denied' : message.approval;
        message.result = { ok: false, error: 'Extension was restarted.' };
        this.enqueueWrite('reset loaded tool message', () =>
          this.options.repository.updateMessage(next.id, message.id, {
            status: message.status,
            approval: message.approval,
            result: message.result
          })
        );
      }
    }

    return next;
  }

  private getDefaultChatTitle(): string {
    const index = this.chats.size + 1;
    return index === 1 ? 'New chat' : `New chat ${index}`;
  }

  private getDuplicateTitle(title: string): string {
    const baseTitle = `${title} copy`;
    if (![...this.chats.values()].some((chat) => chat.title === baseTitle)) {
      return baseTitle;
    }

    let index = 2;
    while ([...this.chats.values()].some((chat) => chat.title === `${baseTitle} ${index}`)) {
      index += 1;
    }

    return `${baseTitle} ${index}`;
  }
}

export async function createFileBackedChatStore(options: FileBackedChatStoreOptions): Promise<FileBackedChatStore> {
  const store = new FileBackedChatStore(options);
  await store.load();
  return store;
}

function getLastMessageAt(chat: Chat): number {
  return chat.messages.at(-1)?.createdAt || chat.createdAt;
}

function getChatTitle(chat: Chat): string {
  const firstUserMessage = chat.messages.find((message) => message.role === 'user' && message.content?.trim());
  return firstUserMessage ? toSingleLinePreview(firstUserMessage.content || '', 50) || chat.title : chat.title;
}

function getLastUserMessage(chat: Chat): string {
  const lastUserMessage = [...chat.messages]
    .reverse()
    .find((message) => message.role === 'user' && message.content?.trim());
  return lastUserMessage ? toSingleLinePreview(lastUserMessage.content || '', 50) : '';
}

function toSingleLinePreview(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function cloneMessage(message: ChatMessage): ChatMessage {
  const cloned = clonePlain(message);
  cloned.id = randomUUID();

  if (cloned.role === 'tool' && (cloned.status === 'waiting' || cloned.status === 'running')) {
    cloned.status = 'error';
    cloned.approval = cloned.approval === 'pending' ? 'denied' : cloned.approval;
    cloned.result = { ok: false, error: 'Chat was duplicated before this tool call finished.' };
  }

  return cloned;
}

function clonePlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeUsage(usage: ChatUsageEstimate | undefined): ChatUsageEstimate {
  return {
    promptTokens: usage?.promptTokens || 0,
    completionTokens: usage?.completionTokens || 0,
    totalTokens: usage?.totalTokens || 0,
    costUsd: usage?.costUsd
  };
}

function getReflectionCandidateKey(candidate: AgentReflectionCandidate): string {
  return `${candidate.kind}:${candidate.scope || ''}:${candidate.content.replace(/\s+/g, ' ').trim().toLowerCase()}`;
}
