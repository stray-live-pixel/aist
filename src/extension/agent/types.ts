import type * as vscode from 'vscode';

import type { AgentRunTelemetryDraft } from '../../core/features/telemetry/telemetry';
import type {
  AgentAttachment,
  ChatModelSettings,
  CodexServiceTier,
  AgentRun as CoreAgentRun,
  EditorContextMode,
  ReasoningEffort
} from '../../core/shared/types/types';
import type { ToolPermissionMode } from '../tools/permissions';
import type { AgentInstructionKind, AgentItemRef, AgentItemScope } from './config/agentConfigStore';
import type { ProviderProfileInput } from './config/providerProfiles';
import type { AgentModeId } from './config/settings';
import type { AgentMemoryScope } from './memory/memory';

export type {
  AgentActivityStream,
  AgentLoopResult,
  ChatModelSettings,
  CodexServiceTier,
  EditorContextMode,
  ReasoningEffort,
  RepeatedToolCall,
  ToolApprovalDecision
} from '../../core/shared/types/types';

/**
 * Хранит состояние одного активного запуска агента.
 *
 * Нужен, чтобы остановка, отмена HTTP-запроса и ответы на permission prompt
 * управлялись из одного места. Создается в AgentController.ask и передается
 * в agent loop/tool calls вместо набора разрозненных флагов.
 */
export type AgentRun = CoreAgentRun<AgentRunTelemetryDraft>;

/**
 * Входящие сообщения из webview UI.
 *
 * Дискриминированный union оставляет обработчик сообщений типобезопасным:
 * при switch/if по `type` TypeScript знает, какие поля доступны для команды.
 */
export type WebviewMessage =
  | { type: 'webviewReady' }
  | {
      type: 'performance.renderMetric';
      component: string;
      chatId?: string;
      messageCount?: number;
      startedAt: number;
      finishedAt: number;
      durationMs: number;
      renderCount: number;
      maxRenderDurationMs: number;
    }
  | { type: 'ask'; prompt: string; continueWithoutUserPrompt?: boolean; attachments?: AgentAttachment[] }
  | { type: 'newChat' }
  | { type: 'duplicateChat'; chatId: string }
  | { type: 'deleteChat'; chatId: string }
  | { type: 'setActiveChat'; chatId: string }
  | { type: 'openChatInEditor'; chatId?: string }
  | { type: 'openChatJson'; chatId?: string }
  | { type: 'setModel'; model: string }
  | { type: 'setDefaultModel'; model: string }
  | { type: 'setChatModelSettings'; settings: Partial<ChatModelSettings> }
  | { type: 'resetChatModelSettings' }
  | { type: 'refreshModelsForProvider'; provider: 'openrouter' | 'codex' }
  | { type: 'setToolPermission'; toolName: string; permission: ToolPermissionMode }
  | { type: 'setToolPermissionPreset'; presetId: string }
  | { type: 'setProjectToolEnabled'; toolId: string; enabled: boolean }
  | { type: 'setMaxToolIterations'; maxToolIterations: number }
  | { type: 'setReasoningEffort'; reasoningEffort: ReasoningEffort }
  | { type: 'setCodexServiceTier'; codexServiceTier: CodexServiceTier }
  | { type: 'setEditorContextMode'; editorContextMode: EditorContextMode }
  | { type: 'setStreamingEnabled'; streamingEnabled: boolean }
  | { type: 'setToolCallNotesRequired'; required: boolean }
  | { type: 'setVcsCommand'; command: string }
  | { type: 'upsertProviderProfile'; profile: ProviderProfileInput }
  | { type: 'setProviderProfileApiKey'; profileId: string; apiKey: string }
  | { type: 'duplicateProviderProfile'; profileId: string }
  | { type: 'deleteProviderProfile'; profileId: string }
  | {
      type: 'setAuxiliaryModelSettings';
      id: 'compaction' | 'tool' | 'memory';
      settings: Partial<{ model: string; reasoningEffort: ReasoningEffort; allowTools: boolean }>;
    }
  | {
      type: 'setAuxiliaryToolModelOverrides';
      overrides: Array<{ toolName: string; model: string; reasoningEffort: ReasoningEffort; allowTools: boolean }>;
    }
  | { type: 'compactChat'; chatId?: string }
  | {
      type: 'setCompactionSettings';
      settings: Partial<{ enabled: boolean; thresholdPercent: number; keepLastMessages: number }>;
    }
  | {
      type: 'setApprovalNotificationSettings';
      settings: Partial<{
        enabled: boolean;
        systemNotifications: boolean;
        sound: boolean;
        volume: number;
        durationSeconds: number;
      }>;
    }
  | {
      type: 'setComposerUiSettings';
      settings: Partial<{ gradientWhileBusy: boolean; minimizeOnBlur: boolean }>;
    }
  | { type: 'setAgentLanguage'; language: 'ru' | 'en' }
  | { type: 'setAgentMode'; modeId: AgentModeId }
  | { type: 'setAgentModeInstructions'; modeId: AgentModeId; instructions: string }
  | { type: 'setAgentConfigScope'; scope: 'workspace' | 'user' }
  | { type: 'setProjectInstructions'; instructions: string }
  | { type: 'addAgentMode'; label: string; instructions: string }
  | { type: 'deleteAgentMode'; modeId: string }
  | {
      type: 'upsertPromptItem';
      scope: AgentItemScope;
      kind: AgentInstructionKind;
      id?: string;
      label: string;
      content: string;
    }
  | { type: 'duplicatePromptItem'; scope: AgentItemScope; kind: AgentInstructionKind; id: string }
  | { type: 'deletePromptItem'; scope: AgentItemScope; kind: AgentInstructionKind; id: string }
  | { type: 'setActivePromptConfig'; instructionRefs: AgentItemRef[]; modeRef?: AgentItemRef; presetId?: string }
  | { type: 'applyPromptPreset'; presetId: string }
  | {
      type: 'upsertPromptPreset';
      id?: string;
      label: string;
      instructionRefs: AgentItemRef[];
      modeRef?: AgentItemRef;
      scope?: AgentItemScope;
    }
  | { type: 'deletePromptPreset'; presetId: string }
  | { type: 'setMemorySettings'; settings: Partial<{ autoApply: boolean }> }
  | { type: 'setMemoryEnabled'; scope: AgentMemoryScope; id: string; enabled: boolean }
  | { type: 'deleteMemory'; scope: AgentMemoryScope; id: string }
  | { type: 'saveReflectionCandidate'; chatId: string; candidateId: string }
  | { type: 'rejectReflectionCandidate'; chatId: string; candidateId: string }
  | { type: 'runMemoryAnalysis'; chatId: string }
  | {
      type: 'addSkill';
      scope?: AgentItemScope;
      label: string;
      description: string;
      command: string;
      permission: ToolPermissionMode;
    }
  | {
      type: 'updateSkill';
      scope?: AgentItemScope;
      skillId: string;
      label: string;
      description: string;
      command: string;
      permission: ToolPermissionMode;
    }
  | { type: 'deleteSkill'; scope?: AgentItemScope; skillId: string }
  | { type: 'codexLogin' }
  | { type: 'codexLogout' }
  | {
      type: 'resolveToolCall';
      messageId: string;
      decision: 'approve' | 'deny-stop' | 'deny-continue';
      comment?: string;
      rememberGlobal?: string;
      rememberProject?: string;
    }
  | { type: 'openWorkspaceFile'; path: string; line?: number; column?: number; endLine?: number; endColumn?: number }
  | { type: 'stop'; chatId?: string }
  | { type: 'clear' }
  | { type: 'copyMessage'; markdown: string }
  | { type: 'vcs.refresh' }
  | { type: 'vcs.isolateChat' }
  | { type: 'vcs.commitAndForcePush' }
  | { type: 'vcs.mergeToMain' }
  | { type: 'isolation.start'; prompt: string }
  | { type: 'isolation.continue'; sessionId: string; prompt: string }
  | { type: 'isolation.stop'; sessionId: string }
  | { type: 'isolation.destroy'; sessionId: string }
  | { type: 'isolation.openWorktree'; sessionId: string }
  | { type: 'isolation.openPr'; sessionId: string }
  | { type: 'isolation.loadEvents'; sessionId: string }
  | { type: 'isolation.refresh' };

/**
 * Абстракция над webview-поверхностью: sidebar и editor panel имеют разный
 * жизненный цикл, но контроллер отправляет им одинаковые state/page сообщения.
 *
 * Методы getChatId/setChatId скрывают различие: sidebar синхронизирует активный
 * чат со store, editor panel держит собственную привязку к открытому чату.
 */
export type WebviewSurface = {
  id: string;
  kind: 'sidebar' | 'editor';
  webview: vscode.Webview;
  getChatId(): string;
  setChatId(chatId: string): void;
  /** Временный editor surface открыт до записи чата в FS и показывает пользователю loading-состояние. */
  isPendingChatCreation?(): boolean;
  /** Текст loading-состояния для временной вкладки создания чата. */
  getPendingChatCreationMessage?(): string;
};
