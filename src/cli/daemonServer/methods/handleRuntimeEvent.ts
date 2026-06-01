import type { Socket } from 'node:net';

import type {
  AgentRuntimeChatRepository,
  AgentRuntimeConfigSnapshot,
  AgentRuntimeToolCallHandler
} from '../../../core/app/runtime/agentRuntime';
import type { AgentRuntimeService as AgentRuntimeServiceType } from '../../../core/app/runtime/agentRuntime';
import type { AuxiliaryModelInvoker } from '../../../core/entities/model/auxiliaryModel';
import type { FetchLike, ModelClient } from '../../../core/entities/model/modelTransport';
import type { ProviderProfile } from '../../../core/entities/model/providerProfile';
import type { AgentSkill } from '../../../core/features/skills/skills';
import type { AgentLanguage } from '../../../core/features/system-prompt/prompts';
import type { ToolRegistry } from '../../../core/features/tool-execution/toolRegistry';
import type {
  ToolExecutionPreview,
  ToolRunnerExecutionAdapter
} from '../../../core/features/tool-execution/toolRunner';
import type { AutonomousExportFormat, AutonomousLaunchOptions } from '../../../core/processes/autonomous';
import type { EditorContextInput } from '../../../core/shared/types/types';
import type {
  Chat,
  ChatModelSettings,
  CodexServiceTier,
  EditorContextMode,
  JsonObject,
  JsonValue,
  ModelProvider,
  OpenRouterModelOption,
  ReasoningEffort,
  RuntimeEvent,
  ToolApprovalDecision,
  ToolPermissionMode
} from '../../../core/shared/types/types';
import type {
  DaemonActiveRun,
  DaemonApprovalResolveParams,
  DaemonApprovalResolveResult,
  DaemonAutonomousExportResult,
  DaemonAutonomousStartResult,
  DaemonAutonomousStateResult,
  DaemonAutonomousStopResult,
  DaemonChatAskResult,
  DaemonChatClearResult,
  DaemonChatCompactResult,
  DaemonChatCreateResult,
  DaemonChatDeleteResult,
  DaemonChatGetResult,
  DaemonChatListResult,
  DaemonChatMemoryAnalyzeResult,
  DaemonChatReflectionCandidateRejectResult,
  DaemonChatReflectionCandidateSaveResult,
  DaemonChatSetModelResult,
  DaemonChatSetModelSettingsResult,
  DaemonChatStopResult,
  DaemonClientCapabilitiesResult,
  DaemonClientPreviewPrepareResult,
  DaemonConfigGetResult,
  DaemonConfigUpdateResult,
  DaemonEvent,
  DaemonEventsSubscribeResult,
  DaemonInitializeResult,
  DaemonModelsResult,
  DaemonState,
  DaemonSubagentGetResult,
  DaemonSubagentListResult,
  JsonRpcId,
  JsonRpcRequest,
  JsonRpcResponse
} from '../../daemonProtocol';
import type { DaemonClientCapabilities, JsonRpcErrorObject } from '../../daemonProtocol';
import type { AistDaemonServer } from '../AistDaemonServer';
import type { DaemonConnection } from '../DaemonConnection';
import type { DaemonRpcError as DaemonRpcErrorType } from '../DaemonRpcError';
import '../methodDeps';
import * as deps from '../methodDeps';

const {
  fs,
  net,
  path,
  FileBackedConfigStore,
  FileSecretStore,
  OPENROUTER_API_KEY_SECRET_KEY,
  AgentRuntimeService,
  ChatRepository,
  AgentMemoryStore,
  createMemoryStorePaths,
  createCoreAuxiliaryModelInvoker,
  CodexAuthSessionProvider,
  CodexResponsesTransport,
  DEFAULT_MODEL,
  normalizeProviderProfiles,
  OpenRouterTransport,
  RunRepository,
  globalSettingsFile,
  globalWorkspaceRoot,
  safeMkdir,
  workspaceAistRoot,
  workspaceSettingsFile,
  SubagentRepository,
  getToolExecutionRequirement,
  normalizeToolApprovalDecision,
  createCompactionMessages,
  selectCompactionTailMessages,
  splitCompactionHistory,
  analyzeMemoryChatDetailed,
  getRelevantMemoryPromptBlockBySubagent,
  validateReflectionCandidates,
  runNodeSkillTool,
  buildFileAgentSystemPrompt,
  DefaultToolRegistry,
  ToolRunner,
  AutonomousBackend,
  getRepoVerificationContextNote,
  createNodeFilesystemToolRunner,
  DAEMON_BUSY_ERROR_CODE,
  DAEMON_EVENT_METHOD,
  DAEMON_PROTOCOL_VERSION,
  getDaemonSocketPath,
  dispatchDaemonRpcMethod,
  DaemonRpcError,
  DaemonFileLogger,
  E2E_OPENROUTER_ENDPOINT_ENV_KEY,
  OPENROUTER_ENV_KEY,
  READONLY_DAEMON_TOOLS,
  REDACTED_VALUE,
  unusedFetch,
  createMemorySubagentMessages,
  createFileBackedRuntimeChatRepository,
  prepareSocketPath,
  isValidJsonRpcRequest,
  isJsonRpcResponse,
  createJsonRpcError,
  toJsonRpcError,
  getDaemonModelOption,
  isEditorContextInput,
  normalizeDaemonSkill,
  normalizeChatModelSettings,
  formatMemorySubagentSuccessText,
  getReflectionMemoryScope,
  getReflectionMemoryNote,
  fallbackModels,
  dedupeAndSortModels,
  toDaemonChat,
  requireRecord,
  asOptionalRecord,
  requireString,
  optionalString,
  getAuxiliaryLegacySettingKey,
  optionalNumber,
  hasApprovalDecision,
  requireJsonValue,
  normalizeConfigScope,
  normalizeToolPermissionsSetting,
  normalizeModelProvider,
  parseAutonomousLaunch,
  normalizeAutonomousExportFormat,
  isJsonValue,
  isJsonObject,
  readOptionalJsonObject,
  mergeJsonObjects,
  getJsonPath,
  redactConfigValue,
  containsSecretLikePath,
  asJsonObject,
  sanitizeLogDetails,
  formatError
} = deps;

export async function handleRuntimeEvent(this: AistDaemonServer, event: RuntimeEvent): Promise<void> {
  if (event.type === 'tool.call.approvalRequested') {
    const pending = {
      approvalId: event.approvalId,
      messageId: event.messageId,
      runId: event.runId,
      chatId: event.chatId
    };
    this.pendingApprovalsById.set(event.approvalId, pending);
    this.pendingApprovalsByMessageId.set(event.messageId, pending);
  } else if (event.type === 'tool.call.approvalResolved') {
    this.pendingApprovalsById.delete(event.approvalId);
    this.pendingApprovalsByMessageId.delete(event.messageId);
  }

  this.broadcastEvent(event);
  await this.broadcastStateChanged(event.type);
}
