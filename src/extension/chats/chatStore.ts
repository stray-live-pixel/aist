import { randomUUID } from 'node:crypto';
import * as vscode from 'vscode';

import { DEFAULT_MODEL } from '../shared/constants';
import type { Chat, ChatMessage, ChatSummary, ChatUsageEstimate } from './types';

const EMPTY_USAGE: ChatUsageEstimate = {
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0
};

export class ChatStore {
  private readonly chats = new Map<string, Chat>();
  private activeChatId: string | undefined;
  private readonly changedEmitter = new vscode.EventEmitter<void>();

  readonly onDidChange = this.changedEmitter.event;

  constructor(
    private readonly storage: vscode.Memento,
    defaultModel: string = DEFAULT_MODEL
  ) {
    this.loadFromStorage(defaultModel);
  }

  private loadFromStorage(defaultModel: string): void {
    try {
      const savedChats = this.storage.get<[string, Chat][]>('chats');
      const savedActiveChatId = this.storage.get<string>('activeChatId');

      if (savedChats && savedChats.length > 0) {
        for (const [id, chat] of savedChats) {
          // Reset transient runtime states
          chat.busy = false;
          chat.activity = undefined;
          chat.usage = normalizeUsage(chat.usage);

          // Reset any stuck tool calls to error state
          if (chat.messages) {
            for (const msg of chat.messages) {
              if (msg.role === 'tool' && (msg.status === 'waiting' || msg.status === 'running')) {
                msg.status = 'error';
                msg.result = { ok: false, error: 'Extension was restarted.' };
              }
            }
          }

          this.chats.set(id, chat);
        }

        if (savedActiveChatId && this.chats.has(savedActiveChatId)) {
          this.activeChatId = savedActiveChatId;
        } else {
          this.activeChatId = savedChats[0][0];
        }
      } else {
        this.createChat(defaultModel);
      }
    } catch {
      this.chats.clear();
      this.createChat(defaultModel);
    }
  }

  private saveToStorage(): void {
    try {
      const entries = Array.from(this.chats.entries());
      void this.storage.update('chats', entries);
      void this.storage.update('activeChatId', this.activeChatId);
    } catch (error) {
      console.error('Failed to save chats to storage:', error);
    }
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
    this.saveToStorage();
    this.changedEmitter.fire();

    return chat;
  }

  duplicateChat(chatId: string): Chat {
    const source = this.requireChat(chatId);
    const now = Date.now();
    const chat: Chat = {
      id: randomUUID(),
      title: this.getDuplicateTitle(source.title),
      model: source.model,
      messages: source.messages.map((message) => cloneMessage(message)),
      history: clonePlain(source.history),
      lastAnswer: source.lastAnswer,
      activity: undefined,
      busy: false,
      usage: normalizeUsage(source.usage),
      createdAt: now,
      updatedAt: now
    };

    this.chats.set(chat.id, chat);
    this.activeChatId = chat.id;
    this.saveToStorage();
    this.changedEmitter.fire();

    return chat;
  }

  deleteChat(chatId: string, fallbackModel: string = DEFAULT_MODEL): Chat {
    const chat = this.requireChat(chatId);
    if (chat.busy) {
      throw new Error('Cannot delete a chat while it is running.');
    }

    this.chats.delete(chatId);

    if (!this.chats.size) {
      return this.createChat(fallbackModel);
    }

    if (this.activeChatId === chatId || !this.activeChatId || !this.chats.has(this.activeChatId)) {
      this.activeChatId = this.getSortedChats()[0].id;
    }

    const activeChat = this.getActiveChat();
    this.saveToStorage();
    this.changedEmitter.fire();

    return activeChat;
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

  getActiveChat(): Chat {
    if (!this.activeChatId || !this.chats.has(this.activeChatId)) {
      return this.createChat();
    }

    return this.chats.get(this.activeChatId)!;
  }

  getChat(chatId: string): Chat | undefined {
    return this.chats.get(chatId);
  }

  setActiveChat(chatId: string): Chat {
    const chat = this.chats.get(chatId);
    if (!chat) {
      throw new Error(`Chat not found: ${chatId}`);
    }

    this.activeChatId = chatId;
    this.saveToStorage();
    this.touch(chat);
    return chat;
  }

  getSummaries(): ChatSummary[] {
    return this.getSortedChats().map((chat) => ({
      id: chat.id,
      title: chat.title,
      model: chat.model,
      messageCount: chat.messages.filter((message) => message.role === 'user' || message.role === 'assistant').length,
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
      chat.title = message.content.trim().slice(0, 48) || chat.title;
    }

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
    this.touch(chat);
    return message;
  }

  clearChat(chatId: string): void {
    const chat = this.requireChat(chatId);
    chat.messages = [];
    chat.history = [];
    chat.lastAnswer = '';
    chat.activity = undefined;
    chat.busy = false;
    chat.context = undefined;
    chat.contextLength = undefined;
    chat.usage = { ...EMPTY_USAGE };
    chat.title = 'New chat';
    this.touch(chat);
  }

  setModel(chatId: string, model: string): void {
    const chat = this.requireChat(chatId);
    chat.model = model;
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
    this.touch(chat);
    return next;
  }

  setActivity(chatId: string, activity: Chat['activity']): void {
    const chat = this.requireChat(chatId);
    chat.activity = activity;
    this.touch(chat);
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
    this.saveToStorage();
    this.changedEmitter.fire();
  }
}

function getLastMessageAt(chat: Chat): number {
  return chat.messages.at(-1)?.createdAt || chat.createdAt;
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
