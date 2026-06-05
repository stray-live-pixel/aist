import type { AgentState, Chat, ChatModelSettings } from '../../shared/types';

function createDefaultModelSettings(): ChatModelSettings {
  return {
    model: '',
    reasoningEffort: 'auto',
    codexServiceTier: 'auto',
    maxToolIterations: 0,
    editorContextMode: 'auto',
    streamingEnabled: false,
    toolsDisabled: false
  };
}

function createEmptyChat(): Chat {
  return {
    id: '',
    title: '',
    model: '',
    modelSettings: createDefaultModelSettings(),
    messages: [],
    lastAnswer: '',
    busy: false,
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    createdAt: 0,
    updatedAt: 0
  };
}

/**
 * Полный безопасный baseline AgentState для web shell.
 *
 * Daemon отдаёт только часть состояния (workspace, список чатов, isolation). Остальные настройки
 * (модели, режимы, permissions, телеметрия) на web ещё не собираются сервером, поэтому web adapter
 * накладывает реальные данные daemon поверх этого baseline. Так общий UI получает корректный
 * непустой AgentState и не падает на неинициализированных полях.
 */
export function createDefaultAgentState(): AgentState {
  return {
    viewKind: 'sidebar',
    extensionVersion: '',
    workspaceName: '',
    tools: [],
    chats: [],
    activeChat: createEmptyChat(),
    models: [],
    providerProfiles: [],
    defaultModelSettings: createDefaultModelSettings(),
    maxToolIterations: 0,
    reasoningEffort: 'auto',
    codexServiceTier: 'auto',
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
      enabled: false,
      thresholdPercent: 80,
      keepLastMessages: 8,
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
      jsonExport: '',
      markdownExport: ''
    },
    performanceTelemetry: {
      recentRecords: [],
      summary: [],
      byChat: [],
      byDay: [],
      byWeek: [],
      byMonth: [],
      byVersion: [],
      blockers: [],
      jsonExport: '',
      markdownExport: ''
    },
    agentLanguage: 'en',
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
    memorySettings: { autoApply: true },
    subagentRuns: [],
    isolationFlowModes: [],
    isolationSessions: [],
    isolationRunners: [],
    isolationRemoteServers: [],
    isolationEventsBySessionId: {},
    instructionSources: [],
    customSkills: [],
    codexAuthenticated: false,
    toolPermissions: [],
    toolPermissionPresets: [],
    activeToolPermissionPresetId: 'custom',
    projectToolDiagnostics: []
  };
}
