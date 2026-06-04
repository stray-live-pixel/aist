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
import type { AutonomousExportFormat, AutonomousLaunchOptions, EditableAutonomousFlowDefinition } from '../../../core/processes/autonomous';
// prettier-ignore
import type { EditorContextInput } from '../../../core/shared/types/types';
// prettier-ignore
import type { Chat, ChatModelSettings, CodexServiceTier, EditorContextMode, JsonObject, JsonValue, ModelProvider, OpenRouterModelOption, ReasoningEffort, RuntimeEvent, ToolApprovalDecision, ToolPermissionMode } from '../../../core/shared/types/types';
// prettier-ignore
import type { DaemonActiveRun, DaemonApprovalResolveParams, DaemonApprovalResolveResult, DaemonAutonomousExportResult, DaemonAutonomousFlowSaveResult, DaemonAutonomousStartResult, DaemonAutonomousStateResult, DaemonAutonomousStopResult, DaemonChatAskResult, DaemonChatClearResult, DaemonChatCompactResult, DaemonChatCreateResult, DaemonChatDeleteResult, DaemonChatGetResult, DaemonChatListResult, DaemonChatMemoryAnalyzeResult, DaemonChatReflectionCandidateRejectResult, DaemonChatReflectionCandidateSaveResult, DaemonChatSetModelResult, DaemonChatSetModelSettingsResult, DaemonChatStopResult, DaemonClientCapabilities, DaemonClientCapabilitiesResult, DaemonClientPreviewPrepareResult, DaemonConfigGetResult, DaemonConfigUpdateResult, DaemonEvent, DaemonEventsSubscribeResult, DaemonInitializeResult, DaemonModelsResult, DaemonState, DaemonSubagentGetResult, DaemonSubagentListResult, JsonRpcErrorObject, JsonRpcId, JsonRpcRequest, JsonRpcResponse } from '../../daemonProtocol';
// prettier-ignore
import type { AistDaemonServer } from '../AistDaemonServer';
// prettier-ignore
import type { DaemonConnection } from '../DaemonConnection';
// prettier-ignore
import type { DaemonRpcError as DaemonRpcErrorType } from '../DaemonRpcError';
import * as deps from '../methodDeps';

// prettier-ignore
const { fs, net, path, FileBackedConfigStore, FileSecretStore, OPENROUTER_API_KEY_SECRET_KEY, AgentRuntimeService, ChatRepository, AgentMemoryStore, createMemoryStorePaths, createCoreAuxiliaryModelInvoker, CodexAuthSessionProvider, CodexResponsesTransport, DEFAULT_MODEL, normalizeProviderProfiles, OpenRouterTransport, RunRepository, globalSettingsFile, globalWorkspaceRoot, safeMkdir, workspaceAistRoot, workspaceSettingsFile, SubagentRepository, getToolExecutionRequirement, normalizeToolApprovalDecision, createCompactionMessages, selectCompactionTailMessages, splitCompactionHistory, analyzeMemoryChatDetailed, getRelevantMemoryPromptBlockBySubagent, validateReflectionCandidates, runNodeSkillTool, buildFileAgentSystemPrompt, DefaultToolRegistry, ToolRunner, AutonomousBackend, getRepoVerificationContextNote, createNodeFilesystemToolRunner, DAEMON_BUSY_ERROR_CODE, DAEMON_EVENT_METHOD, DAEMON_PROTOCOL_VERSION, getDaemonSocketPath, dispatchDaemonRpcMethod, DaemonRpcError, DaemonFileLogger, E2E_OPENROUTER_ENDPOINT_ENV_KEY, OPENROUTER_ENV_KEY, READONLY_DAEMON_TOOLS, REDACTED_VALUE, unusedFetch, createMemorySubagentMessages, createFileBackedRuntimeChatRepository, prepareSocketPath, isValidJsonRpcRequest, isJsonRpcResponse, createJsonRpcError, toJsonRpcError, getDaemonModelOption, isEditorContextInput, normalizeDaemonSkill, normalizeChatModelSettings, formatMemorySubagentSuccessText, getReflectionMemoryScope, getReflectionMemoryNote, fallbackModels, dedupeAndSortModels, toDaemonChat, requireRecord, asOptionalRecord, requireString, optionalString, getAuxiliaryLegacySettingKey, optionalNumber, hasApprovalDecision, requireJsonValue, normalizeConfigScope, normalizeToolPermissionsSetting, normalizeModelProvider, parseAutonomousLaunch, normalizeAutonomousExportFormat, isJsonValue, isJsonObject, readOptionalJsonObject, mergeJsonObjects, getJsonPath, redactConfigValue, containsSecretLikePath, asJsonObject, sanitizeLogDetails, formatError } = deps;

export async function autonomousFlowSave(
  this: AistDaemonServer,
  params: unknown
): Promise<DaemonAutonomousFlowSaveResult> {
  const input = requireRecord(params, 'autonomous.flow.save params');
  await this.autonomousBackend.saveFlow(toEditableFlowDefinition(input.flow));
  return {
    operationId: this.idFactory(),
    state: await this.autonomousBackend.getState()
  };
}

function toEditableFlowDefinition(value: unknown): EditableAutonomousFlowDefinition {
  const flow = requireRecord(value, 'flow');
  const stages = Array.isArray(flow.stages) ? flow.stages : [];
  return {
    id: requireString(flow, 'id'),
    title: stringField(flow, 'title'),
    description: stringField(flow, 'description'),
    body: stringField(flow, 'body'),
    defaultModel: optionalString(flow, 'defaultModel'),
    defaultCodexModel: optionalString(flow, 'defaultCodexModel'),
    defaultSummaryRules: optionalString(flow, 'defaultSummaryRules'),
    stages: stages.map(toEditableStageDefinition)
  };
}

function toEditableStageDefinition(value: unknown): EditableAutonomousFlowDefinition['stages'][number] {
  const stage = requireRecord(value, 'stage');
  const contexts = Array.isArray(stage.contexts) ? stage.contexts : [];
  return {
    file: requireString(stage, 'file'),
    title: stringField(stage, 'title'),
    body: stringField(stage, 'body'),
    model: optionalString(stage, 'model'),
    codexModel: optionalString(stage, 'codexModel'),
    contexts: contexts.map(toEditableContextDefinition),
    summaryRules: optionalString(stage, 'summaryRules')
  };
}

function toEditableContextDefinition(
  value: unknown
): EditableAutonomousFlowDefinition['stages'][number]['contexts'][number] {
  const context = requireRecord(value, 'context');
  const mode = context.mode;
  if (mode !== 'continue' && mode !== 'continue-from' && mode !== 'summary-from') {
    throw new DaemonRpcError(
      -32602,
      'params.invalid',
      "Context mode must be 'continue', 'continue-from', or 'summary-from'."
    );
  }
  if (mode === 'continue') {
    return {
      mode,
      from: typeof context.from === 'number' && Number.isFinite(context.from) ? context.from : undefined
    };
  }

  if (typeof context.from !== 'number' || !Number.isFinite(context.from)) {
    throw new DaemonRpcError(-32602, 'params.invalid', `Context '${mode}' must include numeric 'from'.`, {
      mode
    });
  }

  if (mode === 'continue-from') {
    return { mode, from: context.from };
  }

  return { mode, from: context.from, summaryRules: optionalString(context, 'summaryRules') };
}

function stringField(input: Record<string, unknown>, key: string): string {
  const value = input[key];
  if (typeof value !== 'string') {
    throw new DaemonRpcError(-32602, 'params.invalid', `Param '${key}' must be a string.`, { key });
  }
  return value;
}
