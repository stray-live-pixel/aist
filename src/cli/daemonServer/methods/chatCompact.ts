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

export async function chatCompact(this: AistDaemonServer, params: unknown): Promise<DaemonChatCompactResult> {
  const input = requireRecord(params, 'chat.compact params');
  const chat = await this.requireChat(requireString(input, 'chatId'));
  if (chat.busy || this.activeRunsByChat.has(chat.id) || this.startingRunsByChat.has(chat.id)) {
    throw this.createBusyError();
  }

  const keepLastMessages = optionalNumber(input, 'keepLastMessages') ?? 0;
  const trigger = optionalString(input, 'trigger') || 'manual';
  const compactionMessage = await this.chatRepository.appendMessage(chat.id, {
    role: 'tool',
    name: 'compact_chat',
    status: 'running',
    reason: 'Compact the current chat context before continuing work.',
    nextStep: 'Create a concise summary and open the compacted chat copy.',
    args: {
      trigger,
      keepLastMessages,
      sourceChatId: chat.id
    }
  });
  await this.chatRepository.updateState(chat.id, {
    activity: 'thinking',
    activityDetail: 'Compacting context'
  });
  await this.broadcastStateChanged('chat.compact.started');

  try {
    const { summary, model: compactionModel } = await this.createCompactionSummary(
      chat,
      optionalString(input, 'summary'),
      keepLastMessages
    );
    const tailMessages = selectCompactionTailMessages(chat.messages, keepLastMessages);
    const { tailHistory } = splitCompactionHistory(chat.history, keepLastMessages);
    const compactedAt = this.now();
    const compacted = await this.chatRepository.create({
      title: `${chat.title} compacted`,
      model: chat.model,
      modelSettings: chat.modelSettings,
      previousChatId: chat.id,
      compactedAt,
      compactionModel,
      lastAnswer: summary,
      messages: [{ role: 'assistant', content: summary, createdAt: compactedAt }, ...tailMessages],
      history: [{ role: 'assistant', content: summary }, ...tailHistory],
      state: { busy: false }
    });
    await this.chatRepository.updateMessage(chat.id, compactionMessage.id, {
      status: 'done',
      result: {
        ok: true,
        chatId: compacted.id,
        sourceChatId: chat.id,
        compactedAt,
        compactionModel
      }
    });
    await this.chatRepository.updateState(chat.id, {
      activity: undefined,
      activityDetail: undefined
    });
    await this.broadcastStateChanged('chat.compact');
    return {
      operationId: this.idFactory(),
      chat: toDaemonChat(compacted)
    };
  } catch (error) {
    await this.chatRepository.updateMessage(chat.id, compactionMessage.id, {
      status: 'error',
      result: {
        ok: false,
        error: formatError(error)
      }
    });
    await this.chatRepository.updateState(chat.id, {
      activity: undefined,
      activityDetail: undefined
    });
    await this.broadcastStateChanged('chat.compact.failed');
    throw error;
  }
}
