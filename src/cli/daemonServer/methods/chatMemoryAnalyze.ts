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

export async function chatMemoryAnalyze(
  this: AistDaemonServer,
  params: unknown
): Promise<DaemonChatMemoryAnalyzeResult> {
  const input = requireRecord(params, 'chat.memoryAnalyze params');
  const chat = await this.requireChat(requireString(input, 'chatId'));
  const settings = await this.getMemorySubagentSettings(chat.model);
  const modelClient = this.options.modelClient || this.createRoutingModelClient();
  const startedAt = this.now();
  const run = await this.subagentRepository.create({
    parentChatId: chat.id,
    kind: 'memory.analysis',
    mode: 'single_model_call',
    title: 'Субагент памяти',
    status: 'running',
    model: settings.model,
    includeResultInParentModelContext: false,
    startedAt
  });
  const subagentMessage = await this.chatRepository.appendMessage(chat.id, {
    role: 'subagent',
    status: 'running',
    content: 'Субагент памяти анализирует чат.',
    subagentRunId: run.id,
    subagentKind: run.kind,
    subagent: { runId: run.id, kind: run.kind, title: run.title },
    result: { ok: true, subagentRunId: run.id, stage: 'running', candidateIds: [] }
  });

  await this.broadcastStateChanged('chat.memoryAnalyze.started');

  try {
    const analysis = await analyzeMemoryChatDetailed({
      analysis: {
        chatId: chat.id,
        messages: chat.messages,
        memoryItems: this.memoryStore.list(),
        chatModel: chat.model,
        settings
      },
      modelClient
    });
    const candidates = analysis.candidates.map((candidate) => ({
      ...candidate,
      sourceSubagentRunId: run.id
    }));
    const candidateIds = candidates.map((candidate) => candidate.id);

    if (candidates.length) {
      await this.chatRepository.addReflectionCandidates(chat.id, candidates);
    }

    const finishedAt = this.now();
    const messages = createMemorySubagentMessages({
      runId: run.id,
      parentChatId: chat.id,
      startedAt,
      finishedAt,
      candidateCount: candidates.length,
      error: analysis.error,
      responseContent: analysis.response?.content
    });
    await this.subagentRepository.update(run.id, {
      status: analysis.error ? 'error' : 'success',
      model: analysis.model,
      history: analysis.history,
      messages,
      result: { ok: !analysis.error, candidateIds, candidateCount: candidates.length },
      error: analysis.error,
      finishedAt
    });
    await this.chatRepository.updateMessage(chat.id, subagentMessage.id, {
      status: analysis.error ? 'error' : 'done',
      content: analysis.error
        ? `Субагент памяти завершился с ошибкой: ${analysis.error}`
        : formatMemorySubagentSuccessText(candidates.length),
      result: {
        ok: !analysis.error,
        subagentRunId: run.id,
        candidateIds,
        candidateCount: candidates.length,
        error: analysis.error
      }
    });

    const updatedChat = await this.requireChat(chat.id);
    await this.broadcastStateChanged('chat.memoryAnalyze');
    return {
      operationId: this.idFactory(),
      chat: toDaemonChat(updatedChat),
      candidates
    };
  } catch (error) {
    const finishedAt = this.now();
    const message = formatError(error);
    await this.subagentRepository.update(run.id, {
      status: 'error',
      messages: createMemorySubagentMessages({
        runId: run.id,
        parentChatId: chat.id,
        startedAt,
        finishedAt,
        candidateCount: 0,
        error: message
      }),
      result: { ok: false, candidateIds: [], candidateCount: 0, error: message },
      error: message,
      finishedAt
    });
    await this.chatRepository.updateMessage(chat.id, subagentMessage.id, {
      status: 'error',
      content: `Субагент памяти завершился с ошибкой: ${message}`,
      result: { ok: false, subagentRunId: run.id, candidateIds: [], candidateCount: 0, error: message }
    });
    await this.broadcastStateChanged('chat.memoryAnalyze.failed');
    throw error;
  }
}
