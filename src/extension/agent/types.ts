import type * as vscode from 'vscode';

import type { ChatUsageEstimate } from '../chats/types';
import type { OpenRouterMessage } from '../openrouter/types';
import type { ToolPermissionMode } from '../tools/permissions';
import type { AgentInstructionKind, AgentItemRef, AgentItemScope } from './config/agentConfigStore';
import type { AgentModeId } from './config/settings';

export type ReasoningEffort = 'auto' | 'low' | 'medium' | 'high';

/**
 * Хранит состояние одного активного запуска агента.
 *
 * Нужен, чтобы остановка, отмена HTTP-запроса и ответы на permission prompt
 * управлялись из одного места. Создается в AgentController.ask и передается
 * в agent loop/tool calls вместо набора разрозненных флагов.
 */
export type AgentRun = {
  chatId: string;
  abortController: AbortController;
  stopRequested: boolean;
  permissionResolvers: Map<string, (approved: boolean) => void>;
};

/**
 * Результат полного agent loop после всех вызовов модели и инструментов.
 *
 * Контроллер использует его как единый commit-point: сохраняет историю,
 * последний ответ и usage только после успешного завершения цикла.
 */
export type AgentLoopResult = {
  answer: string;
  history: OpenRouterMessage[];
  usage: ChatUsageEstimate;
};

/**
 * Описание повторяющегося tool call, из-за которого agent loop останавливается.
 *
 * Сигнатура строится без поля reason, потому что reason может меняться текстово,
 * хотя сам инструмент и его существенные аргументы остаются теми же.
 */
export type RepeatedToolCall = {
  signature: string;
  count: number;
  toolName: string;
  args: Record<string, unknown>;
};

/**
 * Входящие сообщения из webview UI.
 *
 * Дискриминированный union оставляет обработчик сообщений типобезопасным:
 * при switch/if по `type` TypeScript знает, какие поля доступны для команды.
 */
export type WebviewMessage =
  | { type: 'webviewReady' }
  | { type: 'ask'; prompt: string }
  | { type: 'newChat' }
  | { type: 'duplicateChat'; chatId: string }
  | { type: 'deleteChat'; chatId: string }
  | { type: 'setActiveChat'; chatId: string }
  | { type: 'openChatInEditor'; chatId?: string }
  | { type: 'setModel'; model: string }
  | { type: 'setToolPermission'; toolName: string; permission: ToolPermissionMode }
  | { type: 'setToolPermissionPreset'; presetId: string }
  | { type: 'setMaxToolIterations'; maxToolIterations: number }
  | { type: 'setReasoningEffort'; reasoningEffort: ReasoningEffort }
  | { type: 'compactChat'; chatId?: string }
  | {
      type: 'setCompactionSettings';
      settings: Partial<{ enabled: boolean; thresholdPercent: number; keepLastMessages: number }>;
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
  | { type: 'addSkill'; label: string; description: string; command: string; permission: ToolPermissionMode }
  | {
      type: 'updateSkill';
      skillId: string;
      label: string;
      description: string;
      command: string;
      permission: ToolPermissionMode;
    }
  | { type: 'deleteSkill'; skillId: string }
  | { type: 'codexLogin' }
  | { type: 'codexLogout' }
  | { type: 'resolveToolCall'; messageId: string; approved: boolean }
  | { type: 'openWorkspaceFile'; path: string; line?: number; column?: number }
  | { type: 'stop' }
  | { type: 'clear' }
  | { type: 'copyMessage'; markdown: string };

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
};
