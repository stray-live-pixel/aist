import { describe, expect, it, vi } from 'vitest';

import { ModelRequestError } from '../../../../entities/model/modelErrors';
import type { ModelClient } from '../../../../entities/model/modelTransport';
import { DefaultToolRegistry } from '../../../../features/tool-execution/toolRegistry';
import { ToolRunner } from '../../../../features/tool-execution/toolRunner';
import type {
  Chat,
  ChatMessage,
  ChatModelRequestStatus,
  ChatUsageEstimate,
  OpenRouterMessage,
  RuntimeEvent,
  ToolApprovalDecision,
  ToolCall
} from '../../../../shared/types/types';
import { type AgentRuntimeChatRepository, AgentRuntimeService, type AgentRuntimeServiceDeps } from '../../agentRuntime';

export class InMemoryRuntimeChatRepository implements AgentRuntimeChatRepository {
  private messageIndex = 0;

  constructor(private readonly chat: Chat) {}

  getChat(chatId: string): Chat | undefined {
    return chatId === this.chat.id ? this.chat : undefined;
  }

  appendMessage(_chatId: string, message: Omit<ChatMessage, 'id' | 'createdAt'>): ChatMessage {
    const nextMessage = {
      id: `message-${++this.messageIndex}`,
      createdAt: 1000 + this.messageIndex,
      ...message
    };
    this.chat.messages.push(nextMessage);
    return nextMessage;
  }

  updateMessage(
    _chatId: string,
    messageId: string,
    patch: Partial<Omit<ChatMessage, 'id' | 'createdAt'>>
  ): ChatMessage {
    const message = this.chat.messages.find((item) => item.id === messageId);
    if (!message) {
      throw new Error(`Message not found: ${messageId}`);
    }
    Object.assign(message, patch);
    return message;
  }

  setBusy(_chatId: string, busy: boolean): void {
    this.chat.busy = busy;
  }

  setActivity(_chatId: string, activity: Chat['activity'], detail?: string): void {
    this.chat.activity = activity;
    this.chat.activityDetail = detail;
  }

  setActivityDetail(_chatId: string, detail: string | undefined): void {
    this.chat.activityDetail = detail;
  }

  setModelRequest(_chatId: string, modelRequest: Chat['modelRequest']): void {
    this.chat.modelRequest = modelRequest;
  }

  updateModelRequest(
    _chatId: string,
    patch: Partial<NonNullable<Chat['modelRequest']>>
  ): ChatModelRequestStatus | undefined {
    if (!this.chat.modelRequest) {
      return undefined;
    }
    this.chat.modelRequest = { ...this.chat.modelRequest, ...patch };
    return this.chat.modelRequest;
  }

  setHistory(_chatId: string, history: Chat['history']): void {
    this.chat.history = history;
  }

  setLastAnswer(_chatId: string, answer: string): void {
    this.chat.lastAnswer = answer;
  }

  addUsage(_chatId: string, usage: Partial<ChatUsageEstimate>): ChatUsageEstimate {
    this.chat.usage = {
      promptTokens: this.chat.usage.promptTokens + (usage.promptTokens || 0),
      completionTokens: this.chat.usage.completionTokens + (usage.completionTokens || 0),
      totalTokens: this.chat.usage.totalTokens + (usage.totalTokens || 0),
      costUsd:
        this.chat.usage.costUsd === undefined && usage.costUsd === undefined
          ? undefined
          : (this.chat.usage.costUsd || 0) + (usage.costUsd || 0)
    };
    return this.chat.usage;
  }

  setContext(_chatId: string, context: Chat['context']): void {
    this.chat.context = context;
    this.chat.contextLength = context?.tokens;
  }

  getActivePlan(): Chat['activePlan'] {
    return this.chat.activePlan;
  }

  setActivePlan(_chatId: string, activePlan: Chat['activePlan']): void {
    this.chat.activePlan = activePlan;
  }
}
