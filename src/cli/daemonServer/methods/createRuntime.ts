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

export function createRuntime(this: AistDaemonServer): AgentRuntimeServiceType {
  const modelClient = this.options.modelClient || this.createRoutingModelClient();
  return new AgentRuntimeService({
    chatRepository: createFileBackedRuntimeChatRepository(this.chatRepository),
    runRepository: this.runRepository,
    modelClient,
    auxiliaryModel: this.auxiliaryModel,
    toolRegistry: this.toolRegistry,
    handleToolCall: this.createToolCallHandler(),
    configProvider: {
      getSnapshot: () => this.getRuntimeConfig()
    },
    promptProvider: {
      getSystemPrompt: async () => {
        const skills = await this.getConfiguredSkills();
        return buildFileAgentSystemPrompt({
          workspaceRoot: this.workspaceRoot,
          homeDir: this.homeDir,
          language: await this.getLanguage(),
          skills: skills.map(({ id, label, description }) => ({ id, label, description }))
        });
      }
    },
    contextProviders: {
      getEditorContext: () => this.getClientEditorContext(),
      getRepoContextNote: (inputPrompt) => getRepoVerificationContextNote(this.workspaceRoot, inputPrompt),
      getMemoryContextBlock: async (input) =>
        getRelevantMemoryPromptBlockBySubagent({
          selection: {
            prompt: input.prompt,
            chatHistory: input.chat.messages,
            memoryItems: this.memoryStore.list(),
            chatModel: input.chat.model,
            settings: await this.getMemorySubagentSettings(input.chat.model)
          },
          modelClient
        })
    },
    modelCatalog: {
      getOption: getDaemonModelOption
    },
    skillProvider: {
      getSkills: () => this.getConfiguredSkills()
    },
    workspaceRootProvider: {
      getWorkspaceRoot: () => this.workspaceRoot
    },
    eventSink: {
      emit: (event) => this.handleRuntimeEvent(event)
    },
    logger: this.logger,
    concurrencyScope: 'chat',
    reflection: {
      enabled: false
    },
    hooks: {
      onRunFinished: ({ runId }) => {
        this.unregisterActiveRun(runId);
        this.clearApprovalsForRun(runId);
        return this.broadcastStateChanged('run.finished');
      }
    }
  });
}
