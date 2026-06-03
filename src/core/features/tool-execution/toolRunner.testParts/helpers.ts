import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { contentToText } from '../../../entities/model/contentToText';
import { createToolError } from '../../../shared/lib/toolErrors';
import type {
  AgentRun,
  Chat,
  ChatMessage,
  OpenRouterMessage,
  ToolApprovalDecision,
  ToolCall
} from '../../../shared/types/types';
import { PROJECT_TOOLS_RELATIVE_DIR } from '../../project-tools/projectTools';
import { DefaultToolRegistry } from '../toolRegistry';
import { ToolCallDeniedError, ToolRunner, type ToolRunnerDeps, type ToolRunnerMutableContext } from '../toolRunner';

export const tempRoots: string[] = [];

export type RunnerContext = {
  chat: Chat;
  run: AgentRun;
  workingMessages: OpenRouterMessage[];
  adapter: ToolRunnerMutableContext;
};

export function createRunnerContext(): RunnerContext {
  const chat = createChat();
  const run: AgentRun = {
    chatId: chat.id,
    startedAt: Date.now(),
    prompt: 'Run tool',
    abortController: new AbortController(),
    stopRequested: false,
    permissionResolvers: new Map()
  };
  const workingMessages: OpenRouterMessage[] = [];
  let messageIndex = 0;
  const adapter: ToolRunnerMutableContext = {
    appendToolMessage: (_chatId, message) => {
      const next: ChatMessage = {
        id: `message-${++messageIndex}`,
        createdAt: Date.now(),
        ...message
      };
      chat.messages.push(next);
      return next;
    },
    updateToolMessage: (_chatId, messageId, patch) => {
      const message = chat.messages.find((item) => item.id === messageId);
      if (!message) {
        throw new Error(`Message not found: ${messageId}`);
      }
      Object.assign(message, patch);
      return message;
    },
    setActivity: (_chatId, activity, detail) => {
      chat.activity = activity;
      chat.activityDetail = detail;
    },
    getActivePlan: () => chat.activePlan,
    setActivePlan: (_chatId, activePlan) => {
      chat.activePlan = activePlan;
    },
    throwIfStopped: (targetRun) => {
      if (targetRun.stopRequested) {
        throw new Error('Stopped by user.');
      }
    }
  };
  return { chat, run, workingMessages, adapter };
}

export function createRunner(context: RunnerContext, overrides: Partial<ToolRunnerDeps> = {}): ToolRunner {
  return new ToolRunner({
    registry: new DefaultToolRegistry(),
    context: context.adapter,
    approvalService: autoApprovalService(),
    filesystem: { execute: vi.fn(async () => ({ ok: true })) },
    now: () => 1700000000000,
    ...overrides
  });
}

export function createHandleParams(context: RunnerContext, toolCall: ToolCall) {
  return {
    chat: context.chat,
    workingMessages: context.workingMessages,
    toolCall,
    run: context.run,
    runId: 'run-1'
  };
}

export function createChat(): Chat {
  const now = Date.now();
  return {
    id: 'chat-1',
    title: 'Test chat',
    model: 'test-model',
    modelSettings: createModelSettings('test-model'),
    messages: [],
    history: [],
    lastAnswer: '',
    busy: false,
    usage: {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0
    },
    createdAt: now,
    updatedAt: now
  };
}

export function createToolCall(name: string, args: Record<string, unknown>, id = `call-${name}`): ToolCall {
  return {
    id,
    type: 'function',
    function: {
      name,
      arguments: {
        reason: 'test reason',
        nextStep: 'test next step',
        ...args
      }
    }
  };
}

export function autoApprovalService() {
  return {
    getPermission: () => 'auto' as const,
    requestApproval: vi.fn(async () => ({
      approved: true,
      continueAfterDeny: false
    }))
  };
}

export function approvalService(decision: ToolApprovalDecision) {
  return {
    getPermission: () => 'ask' as const,
    requestApproval: vi.fn(async () => decision)
  };
}

export function getLastToolMessage(context: RunnerContext): ChatMessage {
  return context.chat.messages.filter((message) => message.role === 'tool').at(-1) as ChatMessage;
}

export function parseToolResult(content: OpenRouterMessage['content']): unknown {
  return JSON.parse(contentToText({ content }) || '{}');
}

export async function createWorkspace(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'aist-core-tool-runner-'));
  tempRoots.push(root);
  return root;
}

export async function writeProjectTool(workspaceRoot: string, id: string): Promise<void> {
  const toolsRoot = path.join(workspaceRoot, PROJECT_TOOLS_RELATIVE_DIR);
  await fs.mkdir(toolsRoot, { recursive: true });
  await fs.writeFile(path.join(toolsRoot, `${id}.sh`), '#!/usr/bin/env bash\ncat\n', 'utf8');
  await fs.writeFile(
    path.join(toolsRoot, `${id}.md`),
    `---
id: ${id}
label: Project echo
description: Echo JSON input.
permission: auto
script: ${id}.sh
input_schema: |
  {"type":"object","properties":{"message":{"type":"string"}},"required":["message"]}
output_mode: json
---
`,
    'utf8'
  );
}

export function createModelSettings(model: string) {
  return {
    model,
    reasoningEffort: 'auto' as const,
    codexServiceTier: 'auto' as const,
    maxToolIterations: 0,
    editorContextMode: 'auto' as const,
    streamingEnabled: false
  };
}
