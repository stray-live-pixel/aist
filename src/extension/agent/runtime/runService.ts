import {
  type AgentRuntimeChatRepository,
  type AgentRuntimeConfigSnapshot,
  AgentRuntimeService,
  type AgentRuntimeTelemetryStatus,
  type AgentRuntimeToolCallHandler
} from '../../../core/agentRuntime';
import { ToolRunner } from '../../../core/toolRunner';
import type {
  ModelRequestLifecycleCallbacks,
  ModelStreamCallbacks,
  OpenRouterMessage,
  OpenRouterModelOption,
  OpenRouterTool,
  RuntimeEvent
} from '../../../core/types';
import type { ChatStore } from '../../chats/chatStore';
import { createChatErrorMessage } from '../../chats/errorMessages';
import { t } from '../../shared/i18n';
import type { AistLogger } from '../../shared/logger';
import { getRepoVerificationContextNote } from '../../shared/repoMap';
import { getWorkspaceFolder } from '../../shared/workspace';
import { getAgentSkills, getSkillPermission, runAgentSkill } from '../../skills/skills';
import { previewFilesystemTool, runFilesystemTool } from '../../tools/filesystemTools';
import { getDisabledProjectToolIds } from '../../tools/permissions';
import { getAgentSettingsSnapshot } from '../config/settingsSnapshot';
import { getEditorContextSnapshot } from '../context/editorContext';
import { getRelevantMemoryPromptBlock } from '../memory/memory';
import { addAgentMemory } from '../memory/memory';
import type { AgentRun, ToolApprovalDecision } from '../types';
import {
  type AgentRunTelemetryDraft,
  createRunTelemetryDraft,
  finalizeRunTelemetry,
  recordApprovalDecision,
  recordApprovalRequested,
  recordContextBytes,
  recordFailedEdit,
  recordModelRequest,
  recordModelUsage,
  recordRepeatedToolCall,
  recordToolCalls,
  recordToolStarted
} from './telemetry';
import { getAgentToolRegistry } from './toolRegistry';
import { getToolCallPermission, showApprovalSystemNotification } from './toolRunner';

export type AgentRunServiceDeps = {
  chats: ChatStore;
  logger: AistLogger;
  sendState(): void;
  reportError(error: unknown, options?: { chatId?: string; context?: string; appendToChat?: boolean }): void;
  getSystemPrompt(): string;
  getModelOption(modelId: string): OpenRouterModelOption | undefined;
  chat(
    messages: OpenRouterMessage[],
    tools?: OpenRouterTool[],
    modelOverride?: string,
    signal?: AbortSignal,
    stream?: ModelStreamCallbacks,
    lifecycle?: ModelRequestLifecycleCallbacks
  ): Promise<OpenRouterMessage>;
};

/**
 * VS Code wrapper over the core agent runtime.
 *
 * The core service owns the loop, retry policy and event stream. This wrapper
 * maps repository mutations to the current ChatStore and reduces runtime events
 * to the existing webview state broadcast until the UI becomes a thin client.
 */
export class AgentRunService {
  private readonly runtime: AgentRuntimeService;

  constructor(private readonly deps: AgentRunServiceDeps) {
    this.runtime = new AgentRuntimeService({
      chatRepository: createChatStoreRuntimeRepository(deps.chats),
      modelClient: {
        chat: deps.chat
      },
      toolRegistry: getAgentToolRegistry(),
      handleToolCall: this.createToolCallHandler(),
      configProvider: {
        getSnapshot: () => this.getRuntimeConfig()
      },
      promptProvider: {
        getSystemPrompt: deps.getSystemPrompt
      },
      contextProviders: {
        getEditorContext: getEditorContextSnapshot,
        getRepoContextNote: getOptionalRepoContextNote,
        getMemoryContextBlock: getRelevantMemoryPromptBlock
      },
      modelCatalog: {
        getOption: deps.getModelOption
      },
      skillProvider: {
        getSkills: getAgentSkills
      },
      workspaceRootProvider: {
        getWorkspaceRoot: () => getWorkspaceFolder().uri.fsPath
      },
      eventSink: {
        emit: (event) => this.handleRuntimeEvent(event)
      },
      logger: deps.logger,
      reportError: deps.reportError,
      createErrorMessage: createChatErrorMessage,
      text: {
        prepareRequest: () => t('activity.detail.prepareRequest'),
        requestModel: () => t('activity.detail.requestModel'),
        requestModelAfterTools: (iteration) => t('activity.detail.requestModelAfterTools', { iteration }),
        retryModelRequest: (attempt, max) => t('activity.detail.retryModelRequest', { attempt, max }),
        finalAnswer: () => t('activity.detail.finalAnswer'),
        modelRequestedTools: (count) => t('activity.detail.modelRequestedTools', { count }),
        stopRequested: () => t('activity.detail.stopRequested'),
        reasoning: (text) => t('activity.detail.reasoning', { text }),
        answerDraft: (text) => t('activity.detail.answerDraft', { text })
      },
      telemetry: {
        createRun: (chat, startedAt, runId) => {
          const draft = createRunTelemetryDraft(chat, startedAt);
          draft.runId = runId;
          return draft;
        },
        finalizeRun: (telemetry, status) =>
          finalizeRunTelemetry(telemetry as AgentRunTelemetryDraft | undefined, toTelemetryStatus(status)),
        recordContextBytes: (telemetry, bytes) =>
          recordContextBytes(telemetry as AgentRunTelemetryDraft | undefined, bytes),
        recordModelRequest: (telemetry) => recordModelRequest(telemetry as AgentRunTelemetryDraft | undefined),
        recordModelUsage: (telemetry, usage) =>
          recordModelUsage(telemetry as AgentRunTelemetryDraft | undefined, usage),
        recordToolCalls: (telemetry, toolNames) =>
          recordToolCalls(telemetry as AgentRunTelemetryDraft | undefined, toolNames),
        recordRepeatedToolCall: (telemetry) => recordRepeatedToolCall(telemetry as AgentRunTelemetryDraft | undefined)
      },
      reflection: {
        enabled: true
      }
    });
  }

  async ask(chatId: string, prompt: string): Promise<void> {
    const chat = this.deps.chats.getChat(chatId) || this.deps.chats.getActiveChat();
    const result = await this.runtime.ask(chat.id, prompt);
    if (!result.accepted && result.error.code === 'run.busy') {
      this.deps.logger.info('Ignoring ask because chat is busy', { chatId: chat.id });
    }
  }

  stop(): void {
    this.runtime.stop();
  }

  resolveToolCall(messageId: string, decision: ToolApprovalDecision): void {
    this.runtime.resolveToolCall(messageId, decision);
  }

  private getRuntimeConfig(): AgentRuntimeConfigSnapshot {
    const settings = getAgentSettingsSnapshot();
    return {
      maxToolIterations: settings.maxToolIterations,
      streamingEnabled: settings.streamingEnabled,
      disabledProjectToolIds: getDisabledProjectToolIds()
    };
  }

  private createToolCallHandler(): AgentRuntimeToolCallHandler {
    return async (params) => {
      const registry = getAgentToolRegistry();
      const run = params.run as AgentRun;
      const runner = new ToolRunner({
        registry,
        context: params.context,
        approvalService: {
          getPermission: (toolName, args) =>
            toolName === 'run_skill'
              ? getSkillPermission(String(args.skillId || ''))
              : getToolCallPermission(toolName, args),
          requestApproval: async (request) => {
            showApprovalSystemNotification(request.toolCall.function.name);
            return new Promise<ToolApprovalDecision>((resolve) => {
              run.permissionResolvers.set(request.messageId, (decision) => {
                run.permissionResolvers.delete(request.messageId);
                resolve(decision);
              });
            });
          }
        },
        filesystem: {
          execute: runFilesystemTool
        },
        projectTools: {
          execute: (toolName, args) => registry.runProjectTool(toolName, args)
        },
        skills: {
          execute: (_toolName, args) => runAgentSkill(args)
        },
        preview: {
          prepare: previewFilesystemTool
        },
        memory: {
          add: addAgentMemory
        },
        telemetry: {
          recordToolStarted: (toolName) => recordToolStarted(run.telemetry, toolName),
          recordApprovalRequested: () => recordApprovalRequested(run.telemetry),
          recordApprovalDecision: (approved) => recordApprovalDecision(run.telemetry, approved),
          recordFailedEdit: (toolName) => recordFailedEdit(run.telemetry, toolName)
        },
        activityFormatter: {
          prepare: (tool, reason) => t('activity.detail.prepareTool', { tool, reason }),
          waitingApproval: (tool, reason) => t('activity.detail.waitingApproval', { tool, reason }),
          runningTool: (tool, reason) => t('activity.detail.runningTool', { tool, reason })
        },
        events: params.events,
        runRepository: params.runRepository,
        getRunId: () => params.runId
      });

      await runner.handleToolCall(params);
    };
  }

  private handleRuntimeEvent(_event: RuntimeEvent): void {
    this.deps.sendState();
  }
}

function createChatStoreRuntimeRepository(chats: ChatStore): AgentRuntimeChatRepository {
  return {
    getChat: (chatId) => chats.getChat(chatId),
    appendMessage: (chatId, message) => chats.appendMessage(chatId, message),
    updateMessage: (chatId, messageId, patch) => chats.updateMessage(chatId, messageId, patch),
    setBusy: (chatId, busy) => {
      chats.setBusy(chatId, busy);
    },
    setActivity: (chatId, activity, detail) => {
      chats.setActivity(chatId, activity, detail);
    },
    setActivityDetail: (chatId, detail) => {
      chats.setActivityDetail(chatId, detail);
    },
    setModelRequest: (chatId, modelRequest) => {
      chats.setModelRequest(chatId, modelRequest);
    },
    updateModelRequest: (chatId, patch) => chats.updateModelRequest(chatId, patch),
    setHistory: (chatId, history) => {
      chats.setHistory(chatId, history);
    },
    setLastAnswer: (chatId, answer) => {
      chats.setLastAnswer(chatId, answer);
    },
    addUsage: (chatId, usage) => chats.addUsage(chatId, usage),
    setContext: (chatId, context) => {
      chats.setContext(chatId, context);
    },
    getActivePlan: (chatId) => chats.getChat(chatId)?.activePlan,
    setActivePlan: (chatId, activePlan) => {
      chats.setActivePlan(chatId, activePlan);
    },
    addReflectionCandidates: (chatId, candidates) => {
      chats.addReflectionCandidates(chatId, candidates || []);
    }
  };
}

function getOptionalRepoContextNote(prompt: string): string {
  try {
    return getRepoVerificationContextNote(getWorkspaceFolder().uri.fsPath, prompt);
  } catch {
    return '';
  }
}

function toTelemetryStatus(status: AgentRuntimeTelemetryStatus) {
  return status === 'success' ? 'success' : status === 'stopped' ? 'stopped' : 'error';
}
