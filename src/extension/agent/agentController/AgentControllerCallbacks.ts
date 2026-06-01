import type { ModelProvider, ToolApprovalDecision } from '../../../core/shared/types/types';
import type { WebviewMessage, WebviewSurface } from '../types';

/**
 * Что это: callbacks фасада AgentController, которые нужны host deps и webview message handlers.
 * Зачем нужно: action-файлы не держат ссылку на класс и не зависят от private-методов.
 * Какую продуктовую проблему решает: контроллер остаётся тонким, а UI-сценарии вызывают стабильные действия.
 */
export type AgentControllerCallbacks = {
  readonly handleWebviewMessage: (surface: WebviewSurface, message: WebviewMessage) => void;
  readonly sendState: (surface?: WebviewSurface) => void;
  readonly postPage: (surface: WebviewSurface, page: 'chat' | 'settings') => void;
  readonly refreshModels: (force?: boolean, provider?: ModelProvider | 'all') => void;
  readonly ask: (chatId: string, prompt: string, options?: { skipUserMessage?: boolean }) => Promise<void>;
  readonly openChatInEditor: (chatId?: string) => void;
  readonly retargetDeletedChat: (deletedChatId: string, nextChatId: string) => void;
  readonly loginCodex: () => Promise<void>;
  readonly logoutCodex: () => Promise<void>;
  readonly openWorkspaceFile: (
    filePath: string,
    line?: number,
    column?: number,
    endLine?: number,
    endColumn?: number
  ) => Promise<void>;
  readonly refreshChatVcs: (chatId: string) => Promise<void>;
  readonly isolateChatVcs: (chatId: string) => Promise<void>;
  readonly commitAndForcePushChatVcs: (chatId: string) => Promise<void>;
  readonly mergeChatVcsToMain: (chatId: string) => Promise<void>;
  readonly resolveToolCall: (messageId: string, decision: ToolApprovalDecision) => Promise<void>;
};
