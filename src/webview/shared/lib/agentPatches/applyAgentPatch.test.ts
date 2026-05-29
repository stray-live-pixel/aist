import { describe, expect, it } from 'vitest';

import type { AgentState, ChatPatchMessage } from '../../types';
import { applyAgentPatch } from './applyAgentPatch';

describe('applyAgentPatch', () => {
  it('adds backend-confirmed message to the active chat and updates summary', () => {
    const patch: ChatPatchMessage = {
      type: 'chat.patch',
      chatId: 'chat-1',
      message: { id: 'message-2', role: 'assistant', content: 'Done', createdAt: 2000 },
      chat: { busy: false, activity: undefined, updatedAt: 2000 },
      summary: { ...createState().chats[0], messageCount: 2, busy: false, updatedAt: 2000 }
    };

    const next = applyAgentPatch(createState(), patch);

    expect(next?.activeChat.messages.map((message) => message.id)).toEqual(['message-1', 'message-2']);
    expect(next?.activeChat.busy).toBe(false);
    expect(next?.chats[0]).toMatchObject({ id: 'chat-1', messageCount: 2, busy: false });
  });

  it('replaces existing message by id instead of duplicating it', () => {
    const patch: ChatPatchMessage = {
      type: 'chat.patch',
      chatId: 'chat-1',
      message: { id: 'message-1', role: 'user', content: 'Updated', createdAt: 1000 }
    };

    const next = applyAgentPatch(createState(), patch);

    expect(next?.activeChat.messages).toHaveLength(1);
    expect(next?.activeChat.messages[0].content).toBe('Updated');
  });

  it('keeps active chat unchanged when patch belongs to another chat but still updates summaries', () => {
    const patch: ChatPatchMessage = {
      type: 'chat.patch',
      chatId: 'chat-2',
      message: { id: 'other-message', role: 'user', content: 'Other', createdAt: 3000 },
      summary: { ...createState().chats[0], id: 'chat-2', title: 'Other chat', updatedAt: 3000 }
    };

    const next = applyAgentPatch(createState(), patch);

    expect(next?.activeChat.id).toBe('chat-1');
    expect(next?.activeChat.messages).toHaveLength(1);
    expect(next?.chats.map((chat) => chat.id)).toEqual(['chat-2', 'chat-1']);
  });
});

function createModelSettings(model: string) {
  return {
    model,
    reasoningEffort: 'auto' as const,
    codexServiceTier: 'auto' as const,
    maxToolIterations: 0,
    editorContextMode: 'auto' as const,
    streamingEnabled: false
  };
}

function createState(): AgentState {
  return {
    viewKind: 'sidebar',
    extensionVersion: '0.0.0',
    workspaceName: 'workspace',
    tools: [],
    chats: [
      {
        id: 'chat-1',
        title: 'Chat',
        model: 'model-a',
        modelSettings: createModelSettings('model-a'),
        messageCount: 1,
        lastUserMessage: 'Hello',
        busy: true,
        lastMessageAt: 1000,
        updatedAt: 1000
      }
    ],
    activeChat: {
      id: 'chat-1',
      title: 'Chat',
      model: 'model-a',
      modelSettings: createModelSettings('model-a'),
      messages: [{ id: 'message-1', role: 'user', content: 'Hello', createdAt: 1000 }],
      lastAnswer: '',
      busy: true,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      createdAt: 1000,
      updatedAt: 1000
    },
    models: [],
    providerProfiles: [
      {
        id: 'openrouter',
        name: 'OpenRouter',
        provider: 'openrouter',
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
        proxyHost: '',
        builtIn: true
      },
      {
        id: 'codex',
        name: 'ChatGPT Codex',
        provider: 'codex',
        endpoint: 'https://chatgpt.com/backend-api/codex/responses',
        proxyHost: '',
        builtIn: true
      }
    ],
    defaultModelSettings: createModelSettings('model-a'),
    maxToolIterations: 0,
    reasoningEffort: 'auto',
    codexServiceTier: 'auto',
    editorContextMode: 'auto',
    streamingEnabled: false,
    auxiliaryModels: {
      compaction: { model: '', reasoningEffort: 'auto', allowTools: false },
      tool: { model: '', reasoningEffort: 'auto', allowTools: false, overrides: [] }
    },
    compactionSettings: {
      enabled: false,
      thresholdPercent: 80,
      keepLastMessages: 0,
      model: '',
      reasoningEffort: 'auto',
      allowTools: false
    },
    approvalNotificationSettings: {
      enabled: true,
      systemNotifications: true,
      sound: true,
      volume: 0.35,
      durationSeconds: 5
    },
    composerUiSettings: { gradientWhileBusy: true, minimizeOnBlur: true },
    telemetry: {
      recentRuns: [],
      aggregates: {
        runCount: 0,
        successCount: 0,
        errorCount: 0,
        stoppedCount: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        toolCallCount: 0,
        repeatedToolCalls: 0,
        failedEdits: 0,
        approvals: { requested: 0, approved: 0, denied: 0 },
        contextBytes: 0,
        averageDurationMs: 0,
        toolCallsByType: {}
      },
      jsonExport: '{}',
      markdownExport: ''
    },
    projectToolDiagnostics: [],
    agentLanguage: 'ru',
    agentMode: 'default',
    agentModes: [],
    agentConfigScope: 'workspace',
    projectInstructions: '',
    promptConfig: {
      globalInstructions: [],
      localInstructions: [],
      globalModes: [],
      localModes: [],
      presets: [],
      activeInstructionRefs: []
    },
    memoryItems: [],
    instructionSources: [],
    customSkills: [],
    codexAuthenticated: false,
    toolPermissions: [],
    toolPermissionPresets: [],
    activeToolPermissionPresetId: 'custom'
  };
}
