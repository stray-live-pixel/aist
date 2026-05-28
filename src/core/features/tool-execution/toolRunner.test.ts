import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createToolError } from '../../shared/lib/toolErrors';
import type {
  AgentRun,
  Chat,
  ChatMessage,
  OpenRouterMessage,
  ToolApprovalDecision,
  ToolCall
} from '../../shared/types/types';
import { PROJECT_TOOLS_RELATIVE_DIR } from '../project-tools/projectTools';
import { DefaultToolRegistry } from './toolRegistry';
import { ToolCallDeniedError, ToolRunner, type ToolRunnerDeps, type ToolRunnerMutableContext } from './toolRunner';

const tempRoots: string[] = [];

describe('ToolRunner', () => {
  afterEach(async () => {
    await Promise.all(tempRoots.map((root) => fs.rm(root, { recursive: true, force: true })));
    tempRoots.length = 0;
  });

  it('executes planning, filesystem, project and skill tools through adapters', async () => {
    const workspaceRoot = await createWorkspace();
    await writeProjectTool(workspaceRoot, 'project_echo');
    const registry = new DefaultToolRegistry();
    await registry.refresh({
      workspaceRoot,
      skills: [{ id: 'demo', label: 'Demo', description: '', command: 'echo demo', permission: 'auto' }]
    });
    const context = createRunnerContext();
    const filesystemExecute = vi.fn(async () => ({ ok: true, stdout: 'fs\n' }));
    const projectExecute = vi.fn(async () => ({ ok: true, output: { project: true } }));
    const skillExecute = vi.fn(async () => ({ ok: true, stdout: 'skill\n' }));
    const runner = createRunner(context, {
      registry,
      filesystem: { execute: filesystemExecute },
      projectTools: { execute: projectExecute },
      skills: { execute: skillExecute },
      approvalService: autoApprovalService()
    });

    await runner.handleToolCall(
      createHandleParams(context, createToolCall('create_plan', { title: 'Plan', steps: ['One'] }))
    );
    await runner.handleToolCall(createHandleParams(context, createToolCall('run_bash_script', { script: 'echo fs' })));
    await runner.handleToolCall(createHandleParams(context, createToolCall('project_echo', { message: 'project' })));
    await runner.handleToolCall(createHandleParams(context, createToolCall('run_skill', { skillId: 'demo' })));

    expect(context.chat.activePlan).toMatchObject({ title: 'Plan', items: [{ text: 'One', status: 'in_progress' }] });
    expect(filesystemExecute).toHaveBeenCalledWith('run_bash_script', expect.objectContaining({ script: 'echo fs' }));
    expect(projectExecute).toHaveBeenCalledWith('project_echo', expect.objectContaining({ message: 'project' }));
    expect(skillExecute).toHaveBeenCalledWith('run_skill', expect.objectContaining({ skillId: 'demo' }));
    expect(context.workingMessages).toHaveLength(4);
  });

  it('stores full approved output separately from compact model-visible output', async () => {
    const context = createRunnerContext();
    const stdout = 'large stdout '.repeat(3000);
    const toolResults: unknown[] = [];
    const runner = createRunner(context, {
      filesystem: {
        execute: vi.fn(async () => ({
          ok: true,
          cwd: '.',
          exitCode: 0,
          signal: null,
          timedOut: false,
          durationMs: 12,
          stdout,
          stderr: '',
          stdoutTruncated: false,
          stderrTruncated: false
        }))
      },
      approvalService: autoApprovalService(),
      runRepository: {
        appendToolResult: async (_runId, result) => {
          toolResults.push(result);
        }
      }
    });

    await runner.handleToolCall(
      createHandleParams(
        context,
        createToolCall('run_bash_script', { reason: 'verify compaction', script: 'printf big' })
      )
    );

    const toolMessage = getLastToolMessage(context);
    const modelResult = parseToolResult(context.workingMessages[0]?.content) as Record<string, unknown>;

    expect(String((toolMessage.result as Record<string, unknown>).stdout)).toContain('large stdout');
    expect(toolMessage.modelResult).toMatchObject({
      ok: true,
      modelResultNotice: {
        compacted: true,
        fullResultStoredIn: 'ChatMessage.result'
      }
    });
    expect(modelResult).toEqual(toolMessage.modelResult);
    expect(modelResult).not.toHaveProperty('stdout');
    expect(toolResults).toHaveLength(1);
    expect(JSON.stringify(toolResults[0])).toContain('large stdout');
  });

  it('returns approve comments and approval memory without hiding the model result', async () => {
    const context = createRunnerContext();
    const memoryAdd = vi.fn(async () => undefined);
    const runner = createRunner(context, {
      approvalService: approvalService({
        approved: true,
        continueAfterDeny: false,
        comment: 'Use smaller steps.',
        rememberProject: 'Prefer focused tests for runner changes.'
      }),
      memory: { add: memoryAdd }
    });

    await runner.handleToolCall(
      createHandleParams(context, createToolCall('create_plan', { title: 'Approval', steps: ['Patch runner'] }))
    );

    expect(parseToolResult(context.workingMessages[0]?.content)).toMatchObject({
      ok: true,
      action: 'create_plan',
      userApprovalComment: 'Use smaller steps.'
    });
    expect(getLastToolMessage(context)).toMatchObject({
      approval: 'approved',
      userApprovalComment: 'Use smaller steps.'
    });
    expect(memoryAdd).toHaveBeenCalledWith({
      scope: 'project',
      note: 'Prefer focused tests for runner changes.'
    });
  });

  it('returns a structured denial result and skips execution on deny-continue', async () => {
    const context = createRunnerContext();
    const filesystemExecute = vi.fn(async () => ({ ok: true }));
    const runner = createRunner(context, {
      filesystem: { execute: filesystemExecute },
      approvalService: approvalService({
        approved: false,
        continueAfterDeny: true,
        comment: 'Do not run this command.'
      })
    });

    await runner.handleToolCall(
      createHandleParams(context, createToolCall('run_bash_script', { script: 'rm -rf tmp' }))
    );

    expect(filesystemExecute).not.toHaveBeenCalled();
    expect(parseToolResult(context.workingMessages[0]?.content)).toEqual({
      ok: false,
      decision: 'denied',
      comment: 'Do not run this command.',
      continueAfterDeny: true,
      userApprovalComment: 'Do not run this command.'
    });
    expect(getLastToolMessage(context)).toMatchObject({ status: 'denied', approval: 'denied' });
  });

  it('stops the run on deny-stop after saving the denial into history', async () => {
    const context = createRunnerContext();
    const runner = createRunner(context, {
      approvalService: approvalService({
        approved: false,
        continueAfterDeny: false,
        comment: 'Stop here.'
      })
    });

    await expect(
      runner.handleToolCall(
        createHandleParams(context, createToolCall('create_plan', { title: 'Stop', steps: ['No'] }))
      )
    ).rejects.toThrow(ToolCallDeniedError);

    expect(context.run.stopRequested).toBe(true);
    expect(parseToolResult(context.workingMessages[0]?.content)).toMatchObject({
      ok: false,
      decision: 'denied',
      continueAfterDeny: false
    });
  });

  it('preserves structured errors in model-visible results', async () => {
    const context = createRunnerContext();
    const runner = createRunner(context, {
      filesystem: {
        execute: vi.fn(async () => {
          throw createToolError('TIMEOUT', 'Tool execution timed out.', { timeoutMs: 1000 });
        })
      },
      approvalService: autoApprovalService()
    });

    await runner.handleToolCall(createHandleParams(context, createToolCall('run_bash_script', { script: 'sleep 10' })));

    expect(parseToolResult(context.workingMessages[0]?.content)).toEqual({
      ok: false,
      code: 'TIMEOUT',
      error: 'Tool execution timed out.',
      details: { timeoutMs: 1000 }
    });
    expect(getLastToolMessage(context)).toMatchObject({
      status: 'error',
      result: {
        ok: false,
        code: 'TIMEOUT',
        error: 'Tool execution timed out.'
      }
    });
  });

  it('compacts repeated large outputs independently', async () => {
    const context = createRunnerContext();
    const stdout = 'repeat-output '.repeat(3000);
    const runner = createRunner(context, {
      filesystem: {
        execute: vi.fn(async () => ({
          ok: true,
          cwd: '.',
          exitCode: 0,
          signal: null,
          timedOut: false,
          durationMs: 1,
          stdout,
          stderr: '',
          stdoutTruncated: false,
          stderrTruncated: false
        }))
      },
      approvalService: autoApprovalService()
    });

    await runner.handleToolCall(
      createHandleParams(context, createToolCall('run_bash_script', { script: 'first' }, 'call-1'))
    );
    await runner.handleToolCall(
      createHandleParams(context, createToolCall('run_bash_script', { script: 'second' }, 'call-2'))
    );

    expect(context.workingMessages).toHaveLength(2);
    expect(context.chat.messages.filter((message) => message.role === 'tool')).toHaveLength(2);
    for (const message of context.workingMessages) {
      const result = parseToolResult(message.content);
      expect(result).toMatchObject({ ok: true, stdoutChars: stdout.length });
      expect(result).not.toHaveProperty('stdout');
    }
  });
});

type RunnerContext = {
  chat: Chat;
  run: AgentRun;
  workingMessages: OpenRouterMessage[];
  adapter: ToolRunnerMutableContext;
};

function createRunnerContext(): RunnerContext {
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

function createRunner(context: RunnerContext, overrides: Partial<ToolRunnerDeps> = {}): ToolRunner {
  return new ToolRunner({
    registry: new DefaultToolRegistry(),
    context: context.adapter,
    approvalService: autoApprovalService(),
    filesystem: { execute: vi.fn(async () => ({ ok: true })) },
    now: () => 1700000000000,
    ...overrides
  });
}

function createHandleParams(context: RunnerContext, toolCall: ToolCall) {
  return {
    chat: context.chat,
    workingMessages: context.workingMessages,
    toolCall,
    run: context.run,
    runId: 'run-1'
  };
}

function createChat(): Chat {
  const now = Date.now();
  return {
    id: 'chat-1',
    title: 'Test chat',
    model: 'test-model',
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

function createToolCall(name: string, args: Record<string, unknown>, id = `call-${name}`): ToolCall {
  return {
    id,
    type: 'function',
    function: {
      name,
      arguments: {
        reason: 'test reason',
        ...args
      }
    }
  };
}

function autoApprovalService() {
  return {
    getPermission: () => 'auto' as const,
    requestApproval: vi.fn(async () => ({
      approved: true,
      continueAfterDeny: false
    }))
  };
}

function approvalService(decision: ToolApprovalDecision) {
  return {
    getPermission: () => 'ask' as const,
    requestApproval: vi.fn(async () => decision)
  };
}

function getLastToolMessage(context: RunnerContext): ChatMessage {
  return context.chat.messages.filter((message) => message.role === 'tool').at(-1) as ChatMessage;
}

function parseToolResult(content: string | undefined): unknown {
  return JSON.parse(content || '{}');
}

async function createWorkspace(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'aist-core-tool-runner-'));
  tempRoots.push(root);
  return root;
}

async function writeProjectTool(workspaceRoot: string, id: string): Promise<void> {
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
