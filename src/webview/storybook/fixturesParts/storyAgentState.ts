import { type AgentState } from '../../shared/types';
import { createModelSettings } from './createModelSettings';
import { storyActiveChat } from './storyActiveChat';
import { storyAgentModes } from './storyAgentModes';
import { storyChatSummaries } from './storyChatSummaries';
import { storyCustomSkills } from './storyCustomSkills';
import { storyInstructionSources } from './storyInstructionSources';
import { storyModels } from './storyModels';
import { storyNow } from './storyNow';
import { storyPromptConfig } from './storyPromptConfig';
import { storyToolPermissionPresets } from './storyToolPermissionPresets';
import { storyToolPermissions } from './storyToolPermissions';
import { storyTools } from './storyTools';

export const storyAgentState: AgentState = {
  viewKind: 'editor',
  extensionVersion: '0.0.8',
  workspaceName: 'ai-agent',
  tools: storyTools,
  chats: storyChatSummaries,
  activeChat: storyActiveChat,
  models: storyModels,
  providerProfiles: [
    {
      id: 'openrouter',
      name: 'OpenRouter',
      provider: 'openrouter',
      endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      proxyHost: '',
      builtIn: true,
      apiKeyConfigured: true,
      apiKeySource: 'profile-secret'
    },
    {
      id: 'codex',
      name: 'ChatGPT Codex',
      provider: 'codex',
      endpoint: 'https://chatgpt.com/backend-api/codex/responses',
      proxyHost: '',
      builtIn: true,
      apiKeyConfigured: false,
      apiKeySource: 'unsupported'
    }
  ],
  defaultModelSettings: createModelSettings('codex:gpt-5.1-codex'),
  maxToolIterations: 6,
  reasoningEffort: 'medium',
  codexServiceTier: 'priority',
  editorContextMode: 'auto',
  streamingEnabled: false,
  toolCallNotesRequired: true,
  vcsCommand: 'git',
  auxiliaryModels: {
    compaction: { model: '', reasoningEffort: 'auto', allowTools: false },
    tool: { model: '', reasoningEffort: 'auto', allowTools: false, overrides: [] },
    memory: { model: '', reasoningEffort: 'auto', allowTools: false }
  },
  compactionSettings: {
    enabled: true,
    thresholdPercent: 70,
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
  composerUiSettings: {
    gradientWhileBusy: true,
    minimizeOnBlur: true
  },
  memorySettings: {
    autoApply: true
  },
  agentLanguage: 'ru',
  agentMode: 'frontend',
  agentModes: storyAgentModes,
  agentConfigScope: 'workspace',
  projectInstructions: 'Prefer simple implementations and run typecheck after edits.',
  promptConfig: storyPromptConfig,
  memoryItems: [
    {
      id: 'prefer-focused-tests',
      scope: 'project',
      note: 'Prefer focused Vitest coverage for the changed extension layer before broader checks.',
      enabled: true,
      importance: 80,
      createdAt: storyNow - 1000 * 60 * 60 * 24,
      updatedAt: storyNow - 1000 * 60 * 30
    }
  ],
  subagentRuns: [],
  isolationSessions: [],
  isolationEventsBySessionId: {},
  instructionSources: storyInstructionSources,
  customSkills: storyCustomSkills,
  codexAuthenticated: true,
  toolPermissions: storyToolPermissions,
  toolPermissionPresets: storyToolPermissionPresets,
  activeToolPermissionPresetId: 'balanced',
  telemetry: {
    storagePath: '/workspace/.aist-agent/telemetry',
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
    jsonExport: '{}\n',
    markdownExport: '# AIST Telemetry\n'
  },
  performanceTelemetry: {
    storagePath: '/Users/example/.aist-agent/performance-telemetry',
    recentRecords: [],
    summary: [],
    byChat: [],
    byDay: [],
    byWeek: [],
    byMonth: [],
    byVersion: [],
    blockers: [],
    jsonExport: '{}\n',
    markdownExport: '# AIST performance telemetry\n'
  },
  projectToolDiagnostics: []
};
