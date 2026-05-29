import { randomUUID } from 'node:crypto';
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
import { DEFAULT_MODEL } from '../../shared/constants';

const EMPTY_USAGE: ChatUsageEstimate = {
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0
};

export class DaemonChatStore implements AgentChatStore {
  private readonly chats = new Map<string, Chat>();
  private readonly changedEmitter = new vscode.EventEmitter<void>();
  private activeChatId: string | undefined;

  readonly onDidChange = this.changedEmitter.event;

  replaceAll(chats: readonly DaemonChat[], activeChatId?: string): void {
    const previousVcs = new Map([...this.chats.values()].map((chat) => [chat.id, chat.vcs]));
    this.chats.clear();
    for (const chat of chats) {
      this.chats.set(chat.id, toExtensionChat(chat, previousVcs.get(chat.id)));
    }

    if (activeChatId && this.chats.has(activeChatId)) {
      this.activeChatId = activeChatId;
    } else if (!this.activeChatId || !this.chats.has(this.activeChatId)) {
      this.activeChatId = this.getSortedChats()[0]?.id;
    }
    this.changedEmitter.fire();
  }

  upsert(chat: DaemonChat): Chat {
    const next = toExtensionChat(chat, this.chats.get(chat.id)?.vcs);
    this.chats.set(next.id, next);
    if (!this.activeChatId) {
      this.activeChatId = next.id;
    }
    this.changedEmitter.fire();
    return next;
  }

  createChat(settings: string | ChatModelSettings = DEFAULT_MODEL): Chat {
    const modelSettings = normalizeInitialModelSettings(settings);
    const now = Date.now();
    const chat: Chat = {
      id: randomUUID(),
      title: 'New chat',
      model: modelSettings.model,
      modelSettings,
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
    this.changedEmitter.fire();
    return chat;
  }

  compactChat(
    chatId: string,
    summary: string,
    tail: { messages?: ChatMessage[]; history?: Chat['history'] } = {}
  ): Chat {
    const source = this.requireChat(chatId);
    const now = Date.now();
    const chat: Chat = {
      id: randomUUID(),
      title: `${source.title} compacted`,
      model: source.model,
      modelSettings: { ...source.modelSettings },
      previousChatId: source.id,
      compactedAt: now,
      messages: [{ id: randomUUID(), role: 'assistant', content: summary, createdAt: now }, ...(tail.messages || [])],
      history: [{ role: 'assistant', content: summary }, ...(tail.history || [])],
      lastAnswer: summary,
      activity: undefined,
      busy: false,
      usage: { ...EMPTY_USAGE },
      createdAt: now,
      updatedAt: now
    };
    this.chats.set(chat.id, chat);
    this.activeChatId = chat.id;
    this.changedEmitter.fire();
    return chat;
  }

  duplicateChat(chatId: string): Chat {
    const source = this.requireChat(chatId);
    const now = Date.now();
    const chat: Chat = {
      ...cloneChat(source),
      id: randomUUID(),
      title: `${source.title} copy`,
      busy: false,
      activity: undefined,
      activityDetail: undefined,
      modelRequest: undefined,
      createdAt: now,
      updatedAt: now
    };
    this.chats.set(chat.id, chat);
    this.activeChatId = chat.id;
    this.changedEmitter.fire();
    return chat;
  }

  deleteChat(chatId: string, fallbackModel: string = DEFAULT_MODEL): Chat {
    this.chats.delete(chatId);
    if (!this.chats.size) {
      return this.createChat(fallbackModel);
    }
    if (this.activeChatId === chatId || !this.activeChatId || !this.chats.has(this.activeChatId)) {
      this.activeChatId = this.getSortedChats()[0].id;
    }
    this.changedEmitter.fire();
    return this.getActiveChat();
  }

  getActiveChat(): Chat {
    if (!this.activeChatId || !this.chats.has(this.activeChatId)) {
      const first = this.getSortedChats()[0];
      if (first) {
        this.activeChatId = first.id;
        return first;
      }
      return this.createChat();
    }
    return this.chats.get(this.activeChatId)!;
  }

  getChat(chatId: string): Chat | undefined {
    return this.chats.get(chatId);
  }

  setActiveChat(chatId: string): Chat {
    const chat = this.requireChat(chatId);
    this.activeChatId = chat.id;
    this.touch(chat);
    return chat;
  }

  getSummaries(): ChatSummary[] {
    return this.getSortedChats().map((chat) => ({
      id: chat.id,
      title: getChatTitle(chat),
      model: chat.model,
      modelSettings: chat.modelSettings,
      previousChatId: chat.previousChatId,
      compactedAt: chat.compactedAt,
      compactionModel: chat.compactionModel,
      vcs: chat.vcs,
      messageCount: chat.messages.filter((message) => message.role === 'user' || message.role === 'assistant').length,
      lastUserMessage: getLastUserMessage(chat),
      busy: chat.busy,
      activity: chat.activity,
      activityDetail: chat.activityDetail,
      lastMessageAt: getLastMessageAt(chat),
      updatedAt: chat.updatedAt
    }));
  }

  appendMessage(chatId: string, message: Omit<ChatMessage, 'id' | 'createdAt'>): ChatMessage {
    const chat = this.requireChat(chatId);
    const next = { id: randomUUID(), createdAt: Date.now(), ...message };
    chat.messages.push(next);
    this.touch(chat);
    return next;
  }

  updateMessage(chatId: string, messageId: string, patch: Partial<Omit<ChatMessage, 'id' | 'createdAt'>>): ChatMessage {
    const chat = this.requireChat(chatId);
    const message = chat.messages.find((item) => item.id === messageId);
    if (!message) {
      throw new Error(`Message not found: ${messageId}`);
    }
    Object.assign(message, patch);
    this.touch(chat);
    return message;
  }

  clearChat(chatId: string): void {
    const chat = this.requireChat(chatId);
    chat.title = 'New chat';
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
    this.touch(chat);
  }

  setModel(chatId: string, model: string): void {
    const chat = this.requireChat(chatId);
    chat.model = model;
    chat.modelSettings = { ...chat.modelSettings, model };
    this.touch(chat);
  }

  setModelSettings(chatId: string, settings: Partial<ChatModelSettings>): void {
    const chat = this.requireChat(chatId);
    chat.modelSettings = normalizeModelSettings({ ...chat.modelSettings, ...settings }, chat.modelSettings);
    chat.model = chat.modelSettings.model;
    this.touch(chat);
  }

  setVcsState(chatId: string, vcs: Chat['vcs']): void {
    const chat = this.requireChat(chatId);
    chat.vcs = vcs;
    this.touch(chat);
  }

  setBusy(chatId: string, busy: boolean): void {
    const chat = this.requireChat(chatId);
    chat.busy = busy;
    this.touch(chat);
  }

  setLastAnswer(chatId: string, answer: string): void {
    const chat = this.requireChat(chatId);
    chat.lastAnswer = answer;
    this.touch(chat);
  }

  setHistory(chatId: string, history: Chat['history']): void {
    const chat = this.requireChat(chatId);
    chat.history = history;
    this.touch(chat);
  }

  addUsage(chatId: string, usage: Partial<ChatUsageEstimate>): ChatUsageEstimate {
    const chat = this.requireChat(chatId);
    chat.usage = {
      promptTokens: chat.usage.promptTokens + (usage.promptTokens || 0),
      completionTokens: chat.usage.completionTokens + (usage.completionTokens || 0),
      totalTokens: chat.usage.totalTokens + (usage.totalTokens || 0),
      costUsd:
        chat.usage.costUsd === undefined && usage.costUsd === undefined
          ? undefined
          : (chat.usage.costUsd || 0) + (usage.costUsd || 0)
    };
    this.touch(chat);
    return chat.usage;
  }

  setContext(chatId: string, context: ChatContextEstimate | undefined): void {
    const chat = this.requireChat(chatId);
    chat.context = context;
    chat.contextLength = context?.tokens;
    this.touch(chat);
  }

  setActivePlan(chatId: string, activePlan: Chat['activePlan']): void {
    const chat = this.requireChat(chatId);
    chat.activePlan = activePlan;
    this.touch(chat);
  }

  addReflectionCandidates(chatId: string, candidates: AgentReflectionCandidate[]): void {
    const chat = this.requireChat(chatId);
    chat.reflectionCandidates = [...(chat.reflectionCandidates || []), ...candidates];
    this.touch(chat);
  }

  setReflectionCandidateStatus(
    chatId: string,
    candidateId: string,
    status: AgentReflectionCandidateStatus
  ): AgentReflectionCandidate | undefined {
    const chat = this.requireChat(chatId);
    const candidate = chat.reflectionCandidates?.find((item) => item.id === candidateId);
    if (!candidate) {
      return undefined;
    }
    candidate.status = status;
    this.touch(chat);
    return candidate;
  }

  setActivity(chatId: string, activity: Chat['activity'], detail?: string): void {
    const chat = this.requireChat(chatId);
    chat.activity = activity;
    chat.activityDetail = detail;
    this.touch(chat);
  }

  setActivityDetail(chatId: string, detail: string | undefined): void {
    const chat = this.requireChat(chatId);
    chat.activityDetail = detail;
    this.touch(chat);
  }

  setModelRequest(chatId: string, modelRequest: Chat['modelRequest']): void {
    const chat = this.requireChat(chatId);
    chat.modelRequest = modelRequest;
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

  private touch(chat: Chat): void {
    chat.updatedAt = Date.now();
    this.changedEmitter.fire();
  }

  private getSortedChats(): Chat[] {
    return [...this.chats.values()].sort((left, right) => right.updatedAt - left.updatedAt);
  }
}

function toExtensionChat(chat: DaemonChat, fallbackVcs?: Chat['vcs']): Chat {
  return {
    id: chat.id,
    title: chat.title,
    model: chat.model,
    modelSettings: normalizeModelSettings(chat.modelSettings, createDefaultModelSettings(chat.model)),
    previousChatId: chat.previousChatId || undefined,
    compactedAt: chat.compactedAt || undefined,
    compactionModel: chat.compactionModel || undefined,
    vcs: chat.vcs || fallbackVcs,
    messages: chat.messages.map((message) => ({ ...message })),
    history: chat.history as Chat['history'],
    lastAnswer: chat.lastAnswer,
    busy: chat.busy,
    activity: normalizeActivity(chat.activity),
    activityDetail: chat.activityDetail || undefined,
    modelRequest: (chat.modelRequest as Chat['modelRequest']) || undefined,
    context: (chat.context as Chat['context']) || undefined,
    contextLength: chat.contextLength || undefined,
    activePlan: (chat.activePlan as Chat['activePlan']) || undefined,
    reflectionCandidates: (chat.reflectionCandidates as AgentReflectionCandidate[]) || [],
    usage: normalizeUsage(chat.usage),
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt
  };
}

function createDefaultModelSettings(model: string): ChatModelSettings {
  return {
    model,
    reasoningEffort: 'auto',
    codexServiceTier: 'auto',
    maxToolIterations: 0,
    editorContextMode: 'auto',
    streamingEnabled: false
  };
}

function normalizeInitialModelSettings(settings: string | ChatModelSettings): ChatModelSettings {
  return typeof settings === 'string'
    ? createDefaultModelSettings(settings)
    : normalizeModelSettings(settings, createDefaultModelSettings(settings.model || DEFAULT_MODEL));
}

function normalizeModelSettings(value: unknown, fallback: ChatModelSettings): ChatModelSettings {
  const settings = value && typeof value === 'object' ? (value as Partial<ChatModelSettings>) : {};
  return {
    model: typeof settings.model === 'string' && settings.model.trim() ? settings.model : fallback.model,
    reasoningEffort:
      settings.reasoningEffort === 'low' || settings.reasoningEffort === 'medium' || settings.reasoningEffort === 'high'
        ? settings.reasoningEffort
        : 'auto',
    codexServiceTier: settings.codexServiceTier === 'priority' ? 'priority' : 'auto',
    maxToolIterations: Math.max(0, Math.floor(Number(settings.maxToolIterations) || 0)),
    editorContextMode:
      settings.editorContextMode === 'selection' ||
      settings.editorContextMode === 'file' ||
      settings.editorContextMode === 'off'
        ? settings.editorContextMode
        : 'auto',
    streamingEnabled: settings.streamingEnabled === true
  };
}

function normalizeUsage(value: unknown): ChatUsageEstimate {
  if (!value || typeof value !== 'object') {
    return { ...EMPTY_USAGE };
  }
  const usage = value as Partial<ChatUsageEstimate>;
  return {
    promptTokens: Number(usage.promptTokens) || 0,
    completionTokens: Number(usage.completionTokens) || 0,
    totalTokens: Number(usage.totalTokens) || 0,
    costUsd: typeof usage.costUsd === 'number' ? usage.costUsd : undefined
  };
}

function normalizeActivity(value: unknown): Chat['activity'] {
  return value === 'thinking' ||
    value === 'waitingForApproval' ||
    value === 'runningTool' ||
    value === 'answering' ||
    value === 'stopping'
    ? value
    : undefined;
}

function cloneChat(chat: Chat): Chat {
  return {
    ...chat,
    messages: chat.messages.map((message) => ({ ...message })),
    history: chat.history.map((message) => ({ ...message })),
    modelSettings: { ...chat.modelSettings },
    usage: { ...chat.usage },
    activePlan: chat.activePlan ? JSON.parse(JSON.stringify(chat.activePlan)) : undefined,
    reflectionCandidates: chat.reflectionCandidates
      ? chat.reflectionCandidates.map((candidate) => ({ ...candidate }))
      : undefined
  };
}

function getChatTitle(chat: Chat): string {
  const firstUser = getLastUserMessage(chat);
  return chat.title === 'New chat' && firstUser ? firstUser.slice(0, 50) : chat.title;
}

function getLastUserMessage(chat: Chat): string {
  return [...chat.messages].reverse().find((message) => message.role === 'user')?.content || '';
}

function getLastMessageAt(chat: Chat): number {
  return chat.messages[chat.messages.length - 1]?.createdAt || chat.updatedAt || chat.createdAt;
}
