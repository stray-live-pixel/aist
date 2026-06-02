// prettier-ignore
import type { Socket } from 'node:net';

// prettier-ignore
import type { AgentRuntimeChatRepository, AgentRuntimeConfigSnapshot, AgentRuntimeService as AgentRuntimeServiceType, AgentRuntimeToolCallHandler } from '../../../core/app/runtime/agentRuntime';
// prettier-ignore
import type { AuxiliaryModelInvoker } from '../../../core/entities/model/auxiliaryModel';
// prettier-ignore
import type { FetchLike, ModelClient } from '../../../core/entities/model/modelTransport';
// prettier-ignore
import type { ProviderProfile } from '../../../core/entities/model/providerProfile';
// prettier-ignore
import type { AgentSkill } from '../../../core/features/skills/skills';
// prettier-ignore
import type { AgentLanguage } from '../../../core/features/system-prompt/prompts';
// prettier-ignore
import type { ToolRegistry } from '../../../core/features/tool-execution/toolRegistry';
// prettier-ignore
import type { ToolExecutionPreview, ToolRunnerExecutionAdapter } from '../../../core/features/tool-execution/toolRunner';
// prettier-ignore
import type { AutonomousExportFormat, AutonomousLaunchOptions } from '../../../core/processes/autonomous';
// prettier-ignore
import type { EditorContextInput } from '../../../core/shared/types/types';
// prettier-ignore
import type { Chat, ChatModelSettings, CodexServiceTier, EditorContextMode, JsonObject, JsonValue, ModelProvider, OpenRouterModelOption, ReasoningEffort, RuntimeEvent, ToolApprovalDecision, ToolPermissionMode } from '../../../core/shared/types/types';
// prettier-ignore
import type { DaemonActiveRun, DaemonApprovalResolveParams, DaemonApprovalResolveResult, DaemonAutonomousExportResult, DaemonAutonomousStartResult, DaemonAutonomousStateResult, DaemonAutonomousStopResult, DaemonChatAskResult, DaemonChatClearResult, DaemonChatCompactResult, DaemonChatCreateResult, DaemonChatDeleteResult, DaemonChatGetResult, DaemonChatListResult, DaemonChatMemoryAnalyzeResult, DaemonChatReflectionCandidateRejectResult, DaemonChatReflectionCandidateSaveResult, DaemonChatSetModelResult, DaemonChatSetModelSettingsResult, DaemonChatStopResult, DaemonClientCapabilities, DaemonClientCapabilitiesResult, DaemonClientPreviewPrepareResult, DaemonConfigGetResult, DaemonConfigUpdateResult, DaemonEvent, DaemonEventsSubscribeResult, DaemonInitializeResult, DaemonModelsResult, DaemonState, DaemonSubagentGetResult, DaemonSubagentListResult, JsonRpcErrorObject, JsonRpcId, JsonRpcRequest, JsonRpcResponse } from '../../daemonProtocol';
// prettier-ignore
import type { AistDaemonServer } from '../AistDaemonServer';
// prettier-ignore
import type { DaemonConnection } from '../DaemonConnection';
// prettier-ignore
import type { DaemonRpcError as DaemonRpcErrorType } from '../DaemonRpcError';
import * as deps from '../methodDeps';

// prettier-ignore
const { fs, net, path, FileBackedConfigStore, FileSecretStore, OPENROUTER_API_KEY_SECRET_KEY, AgentRuntimeService, ChatRepository, AgentMemoryStore, createMemoryStorePaths, createCoreAuxiliaryModelInvoker, CodexAuthSessionProvider, CodexResponsesTransport, DEFAULT_MODEL, normalizeProviderProfiles, OpenRouterTransport, RunRepository, globalSettingsFile, globalWorkspaceRoot, safeMkdir, workspaceAistRoot, workspaceSettingsFile, SubagentRepository, getToolExecutionRequirement, normalizeToolApprovalDecision, createCompactionMessages, selectCompactionTailMessages, splitCompactionHistory, analyzeMemoryChatDetailed, getRelevantMemoryPromptBlockBySubagent, validateReflectionCandidates, runNodeSkillTool, buildFileAgentSystemPrompt, DefaultToolRegistry, ToolRunner, AutonomousBackend, getRepoVerificationContextNote, createNodeFilesystemToolRunner, DAEMON_BUSY_ERROR_CODE, DAEMON_EVENT_METHOD, DAEMON_PROTOCOL_VERSION, getDaemonSocketPath, dispatchDaemonRpcMethod, DaemonRpcError, DaemonFileLogger, E2E_OPENROUTER_ENDPOINT_ENV_KEY, OPENROUTER_ENV_KEY, READONLY_DAEMON_TOOLS, REDACTED_VALUE, unusedFetch, createMemorySubagentMessages, createFileBackedRuntimeChatRepository, prepareSocketPath, isValidJsonRpcRequest, isJsonRpcResponse, createJsonRpcError, toJsonRpcError, getDaemonModelOption, isEditorContextInput, normalizeDaemonSkill, normalizeChatModelSettings, formatMemorySubagentSuccessText, getReflectionMemoryScope, getReflectionMemoryNote, fallbackModels, dedupeAndSortModels, toDaemonChat, requireRecord, asOptionalRecord, requireString, optionalString, getAuxiliaryLegacySettingKey, optionalNumber, hasApprovalDecision, requireJsonValue, normalizeConfigScope, normalizeToolPermissionsSetting, normalizeModelProvider, parseAutonomousLaunch, normalizeAutonomousExportFormat, isJsonValue, isJsonObject, readOptionalJsonObject, mergeJsonObjects, getJsonPath, redactConfigValue, containsSecretLikePath, asJsonObject, sanitizeLogDetails, formatError } = deps;

export async function configUpdate(this: AistDaemonServer, params: unknown): Promise<DaemonConfigUpdateResult> {
  const input = requireRecord(params, 'config.update params');
  const key = requireString(input, 'key');
  const value = requireJsonValue(input.value, 'value');
  const scope = normalizeConfigScope(optionalString(input, 'scope') || 'workspace');
  if (containsSecretLikePath(key, value)) {
    throw new DaemonRpcError(
      -32602,
      'config.secretRejected',
      `Refusing to write secret-like config key '${key}'. Use auth commands for API keys.`,
      { key }
    );
  }

  await this.configStore.set(key, value, { scope });
  if (key === 'toolPermissions' || key === 'openrouterAgent.toolPermissions') {
    this.cachedToolPermissions = normalizeToolPermissionsSetting(value);
  }
  await this.broadcastStateChanged('config.update');
  const redacted = redactConfigValue(key, value);
  return {
    operationId: this.idFactory(),
    key,
    value: redacted.value ?? null,
    scope,
    redacted: redacted.redacted
  };
}
