import type * as vscode from 'vscode';

import type {
  AgentReflectionCandidate,
  AgentReflectionCandidateStatus,
  Chat,
  ChatContextEstimate,
  ChatMessage,
  ChatSummary,
  ChatUsageEstimate
} from './types';

export type AgentChatStore = {
  onDidChange: vscode.Event<void>;
  createChat(settings?: string | Chat['modelSettings']): Chat;
  compactChat(chatId: string, summary: string, tail?: { messages?: ChatMessage[]; history?: Chat['history'] }): Chat;
  duplicateChat(chatId: string): Chat;
  deleteChat(chatId: string, fallbackModel?: string): Chat;
  getActiveChat(): Chat;
  getChat(chatId: string): Chat | undefined;
  setActiveChat(chatId: string): Chat;
  getSummaries(): ChatSummary[];
  appendMessage(chatId: string, message: Omit<ChatMessage, 'id' | 'createdAt'>): ChatMessage;
  updateMessage(chatId: string, messageId: string, patch: Partial<Omit<ChatMessage, 'id' | 'createdAt'>>): ChatMessage;
  clearChat(chatId: string): void;
  setModel(chatId: string, model: string): void;
  setModelSettings(chatId: string, settings: Partial<Chat['modelSettings']>): void;
  setVcsState(chatId: string, vcs: Chat['vcs']): void;
  setBusy(chatId: string, busy: boolean): void;
  setLastAnswer(chatId: string, answer: string): void;
  setHistory(chatId: string, history: Chat['history']): void;
  addUsage(chatId: string, usage: Partial<ChatUsageEstimate>): ChatUsageEstimate;
  setContext(chatId: string, context: ChatContextEstimate | undefined): void;
  setActivePlan(chatId: string, activePlan: Chat['activePlan']): void;
  addReflectionCandidates(chatId: string, candidates: AgentReflectionCandidate[]): void;
  setReflectionCandidateStatus(
    chatId: string,
    candidateId: string,
    status: AgentReflectionCandidateStatus
  ): AgentReflectionCandidate | undefined;
  setActivity(chatId: string, activity: Chat['activity'], detail?: string): void;
  setActivityDetail(chatId: string, detail: string | undefined): void;
  setModelRequest(chatId: string, modelRequest: Chat['modelRequest']): void;
  updateModelRequest(
    chatId: string,
    patch: Partial<NonNullable<Chat['modelRequest']>>
  ): Chat['modelRequest'] | undefined;
};
