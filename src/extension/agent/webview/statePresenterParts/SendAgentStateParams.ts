import type { IsolationFlowModeSummary, IsolationSessionSummary } from '../../../../cli/daemonProtocol';
import { type SecretStore } from '../../../../core/app/config/config';
import { type OpenRouterModelOption, type SubagentRun } from '../../../../core/shared/types/types';
import { type AgentChatStore } from '../../../chats/chatDataStore';
import { type AistLogger } from '../../../shared/logger';
import { type WebviewSurface } from '../../types';

export type SendAgentStateParams = {
  /** Версия берётся из ExtensionContext.packageJSON: это установленный VSIX, а не исходный package.json в workspace. */
  extensionVersion: string;
  surfaces: WebviewSurface[];
  chats: AgentChatStore;
  logger: AistLogger;
  secretStore: SecretStore;
  modelOptions: OpenRouterModelOption[];
  codexAuthenticated: boolean;
  subagentRunsByChatId: Map<string, SubagentRun[]>;
  isolationFlowModes: readonly IsolationFlowModeSummary[];
  isolationSessions: readonly IsolationSessionSummary[];
  getSystemPrompt(): string;
};
