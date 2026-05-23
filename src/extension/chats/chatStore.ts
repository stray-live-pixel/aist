import { randomUUID } from 'node:crypto';
import * as vscode from 'vscode';
import { DEFAULT_MODEL } from '../shared/constants';
import type { Chat, ChatMessage, ChatSummary } from './types';

export class ChatStore {
  private readonly chats = new Map<string, Chat>();
  private activeChatId: string | undefined;
  private readonly changedEmitter = new vscode.EventEmitter<void>();

  readonly onDidChange = this.changedEmitter.event;

  constructor(defaultModel: string = DEFAULT_MODEL) {
    this.createChat(defaultModel);
  }

  createChat(model: string = DEFAULT_MODEL): Chat {
    const now = Date.now();
    const chat: Chat = {
      id: randomUUID(),
      title: 'New chat',
      model,
      messages: [],
      history: [],
      lastAnswer: '',
      busy: false,
      createdAt: now,
      updatedAt: now
    };

    this.chats.set(chat.id, chat);
    this.activeChatId = chat.id;
    this.changedEmitter.fire();

    return chat;
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
    this.touch(chat);
    return chat;
  }

  getSummaries(): ChatSummary[] {
    return [...this.chats.values()]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((chat) => ({
        id: chat.id,
        title: chat.title,
        model: chat.model,
        messageCount: chat.messages.filter((message) => message.role === 'user' || message.role === 'assistant').length,
        busy: chat.busy,
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
    chat.busy = false;
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
}
