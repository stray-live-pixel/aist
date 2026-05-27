import { describe, expect, it, vi } from 'vitest';

import { ChatStore } from '../../chats/chatStore';
import type { ChatMessage } from '../../chats/types';
import type { OpenRouterMessage, ToolCall } from '../../openrouter/types';
import { createToolError } from '../../shared/toolErrors';
import { addAgentMemory } from '../memory/memory';
import type { AgentRun, ToolApprovalDecision } from '../types';
import { handleAgentToolCall } from './toolRunner';

type Listener<T> = (event: T) => unknown;

const filesystemToolsMock = vi.hoisted(() => ({
  filesystemTools: [
    {
      type: 'function',
      function: {
        name: 'run_bash_script'
      }
    }
  ],
  runFilesystemTool: vi.fn(async (toolName: string) => {
    if (toolName === 'run_bash_script') {
      return {
        ok: true,
        cwd: '.',
        exitCode: 0,
        signal: null,
        timedOut: false,
        durationMs: 12,
        stdout: 'large stdout '.repeat(1000),
        stderr: '',
        stdoutTruncated: false,
        stderrTruncated: false
      };
    }

    return { ok: true };
  }),
  previewFilesystemTool: vi.fn(async (): Promise<unknown> => undefined)
}));

vi.mock('../../tools/filesystemTools', () => filesystemToolsMock);
vi.mock('../memory/memory', () => ({
  addAgentMemory: vi.fn(async () => undefined)
}));

vi.mock('vscode', () => {
  class EventEmitter<T> {
    private listeners: Listener<T>[] = [];

    event = (listener: Listener<T>) => {
      this.listeners.push(listener);
      return { dispose: () => undefined };
    };

    fire(event: T): void {
      for (const listener of this.listeners) {
        listener(event);
      }
    }

    dispose(): void {
      this.listeners = [];
    }
  }

  return {
    EventEmitter,
    window: {
      showInformationMessage: vi.fn()
    },
    workspace: {
      getConfiguration: () => ({
        get: (key: string) => {
          if (key === 'approvalNotifications') {
            return { enabled: false };
          }
          if (key === 'toolPermissions') {
            return {};
          }
          return undefined;
        },
        update: vi.fn()
      })
    },
    ConfigurationTarget: {
      Workspace: 2
    }
  };
});

describe('handleAgentToolCall approval feedback', () => {
  it('stores full tool output for UI while sending compact output to model history', async () => {
    const context = createToolRunnerContext({
      approved: true,
      continueAfterDeny: false
    });

    await handleAgentToolCall({
      chat: context.chat,
      workingMessages: context.workingMessages,
      toolCall: {
        id: 'call-bash',
        type: 'function',
        function: {
          name: 'run_bash_script',
          arguments: {
            reason: 'verify large output handling',
            script: 'printf big'
          }
        }
      },
      run: context.run,
      chats: context.chats,
      sendState: vi.fn(),
      throwIfStopped: vi.fn(),
      askToolPermission: vi.fn(async () => context.decision)
    });

    const toolMessage = getLastToolMessage(context);
    const modelResult = parseToolResult(context.workingMessages[0]?.content) as Record<string, unknown>;

    expect(String(toolMessage.result?.stdout)).toContain('large stdout');
    expect(toolMessage.modelResult).toMatchObject({
      ok: true,
      modelResultNotice: {
        compacted: true,
        fullResultStoredIn: 'ChatMessage.result'
      }
    });
    expect(modelResult).toEqual(toolMessage.modelResult);
    expect(modelResult).not.toHaveProperty('stdout');
    expect(JSON.stringify(modelResult).length).toBeLessThan(String(toolMessage.result?.stdout).length);
  });

  it('returns approve comments as userApprovalComment in the model-visible tool result', async () => {
    const context = createToolRunnerContext({
      approved: true,
      continueAfterDeny: false,
      comment: 'Use smaller steps.'
    });

    await runCreatePlanTool(context);

    expect(parseToolResult(context.workingMessages[0]?.content)).toMatchObject({
      ok: true,
      action: 'create_plan',
      userApprovalComment: 'Use smaller steps.'
    });
    expect(getLastToolMessage(context).userApprovalComment).toBe('Use smaller steps.');
    expect(getLastToolMessage(context).approval).toBe('approved');
  });

  it('saves only explicitly filled approval memory fields', async () => {
    vi.mocked(addAgentMemory).mockClear();
    const context = createToolRunnerContext({
      approved: true,
      continueAfterDeny: false,
      comment: 'Current run only.',
      rememberProject: 'Use focused tests for approval changes.'
    });

    await runCreatePlanTool(context);

    expect(addAgentMemory).toHaveBeenCalledTimes(1);
    expect(addAgentMemory).toHaveBeenCalledWith({
      scope: 'project',
      note: 'Use focused tests for approval changes.'
    });
  });

  it('returns deny-continue comments as a structured denial result', async () => {
    const context = createToolRunnerContext({
      approved: false,
      continueAfterDeny: true,
      comment: 'Do not create a plan yet.'
    });

    await runCreatePlanTool(context);

    expect(context.chat.activePlan).toBeUndefined();
    expect(parseToolResult(context.workingMessages[0]?.content)).toEqual({
      ok: false,
      decision: 'denied',
      comment: 'Do not create a plan yet.',
      continueAfterDeny: true,
      userApprovalComment: 'Do not create a plan yet.'
    });
    expect(getLastToolMessage(context)).toMatchObject({
      status: 'denied',
      approval: 'denied',
      userApprovalComment: 'Do not create a plan yet.'
    });
  });

  it('cleans up edit_file preview on denial so preview edits can roll back', async () => {
    const cleanup = vi.fn(async () => undefined);
    const approve = vi.fn(async () => ({ ok: true }));
    filesystemToolsMock.previewFilesystemTool.mockResolvedValueOnce({
      preview: {
        ok: true,
        path: 'src/example.ts',
        diffShown: true,
        editable: true,
        strategyUsed: 'exact_replace'
      },
      approve,
      cleanup
    });
    const context = createToolRunnerContext({
      approved: false,
      continueAfterDeny: true,
      comment: 'Do not apply this edit.'
    });

    await handleAgentToolCall({
      chat: context.chat,
      workingMessages: context.workingMessages,
      toolCall: {
        id: 'call-edit-file',
        type: 'function',
        function: {
          name: 'edit_file',
          arguments: {
            reason: 'semantic edit',
            path: 'src/example.ts',
            strategy: 'auto',
            instructions: 'Rename the token.',
            expectedChange: {
              search: 'old',
              replacement: 'new'
            }
          }
        }
      },
      run: context.run,
      chats: context.chats,
      sendState: vi.fn(),
      throwIfStopped: vi.fn(),
      askToolPermission: vi.fn(async () => context.decision)
    });

    expect(filesystemToolsMock.previewFilesystemTool).toHaveBeenCalledWith(
      'edit_file',
      expect.objectContaining({ path: 'src/example.ts' })
    );
    expect(approve).not.toHaveBeenCalled();
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(filesystemToolsMock.runFilesystemTool).not.toHaveBeenCalledWith('edit_file', expect.anything());
    expect(getLastToolMessage(context)).toMatchObject({
      status: 'denied',
      approval: 'denied',
      result: {
        preview: expect.objectContaining({ strategyUsed: 'exact_replace' })
      }
    });
  });

  it('stops the current run on deny-stop', async () => {
    const context = createToolRunnerContext({
      approved: false,
      continueAfterDeny: false,
      comment: 'Stop here.'
    });

    await expect(runCreatePlanTool(context)).rejects.toThrow('The user denied this tool call.');

    expect(context.run.stopRequested).toBe(true);
    expect(context.chat.activePlan).toBeUndefined();
    expect(parseToolResult(context.workingMessages[0]?.content)).toMatchObject({
      ok: false,
      decision: 'denied',
      comment: 'Stop here.',
      continueAfterDeny: false,
      userApprovalComment: 'Stop here.'
    });
  });

  it('preserves structured error codes in model-visible catch results', async () => {
    const context = createToolRunnerContext({
      approved: true,
      continueAfterDeny: false
    });

    await handleAgentToolCall({
      chat: context.chat,
      workingMessages: context.workingMessages,
      toolCall: createPlanToolCall(),
      run: context.run,
      chats: context.chats,
      sendState: vi.fn(),
      throwIfStopped: () => {
        throw createToolError('TIMEOUT', 'Tool execution timed out.', { timeoutMs: 1000 });
      },
      askToolPermission: vi.fn(async () => context.decision)
    });

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
});

function createToolRunnerContext(decision: ToolApprovalDecision) {
  const chats = new ChatStore(createMemento(), 'test-model');
  const chat = chats.getActiveChat();
  const run: AgentRun = {
    chatId: chat.id,
    startedAt: Date.now(),
    prompt: 'Run tool',
    abortController: new AbortController(),
    stopRequested: false,
    permissionResolvers: new Map()
  };

  return {
    chat,
    chats,
    run,
    decision,
    workingMessages: [] as OpenRouterMessage[]
  };
}

function runCreatePlanTool(context: ReturnType<typeof createToolRunnerContext>) {
  return handleAgentToolCall({
    chat: context.chat,
    workingMessages: context.workingMessages,
    toolCall: createPlanToolCall(),
    run: context.run,
    chats: context.chats,
    sendState: vi.fn(),
    throwIfStopped: (run) => {
      if (run.stopRequested) {
        throw new Error('Stopped by user.');
      }
    },
    askToolPermission: vi.fn(async () => context.decision)
  });
}

function createPlanToolCall(): ToolCall {
  return {
    id: 'call-create-plan',
    type: 'function',
    function: {
      name: 'create_plan',
      arguments: {
        reason: 'Plan before changing code.',
        title: 'Approval feedback',
        steps: ['Inspect approval flow.', 'Patch tool result mapping.']
      }
    }
  };
}

function getLastToolMessage(context: ReturnType<typeof createToolRunnerContext>): ChatMessage {
  return context.chat.messages.filter((message) => message.role === 'tool').at(-1) as ChatMessage;
}

function parseToolResult(content: string | undefined): unknown {
  return JSON.parse(content || '{}');
}

function createMemento() {
  const values = new Map<string, unknown>();

  return {
    get<T>(key: string): T | undefined {
      return values.get(key) as T | undefined;
    },
    update(key: string, value: unknown): Thenable<void> {
      values.set(key, value);
      return Promise.resolve();
    },
    keys(): readonly string[] {
      return [...values.keys()];
    }
  };
}
