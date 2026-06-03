import path from 'node:path';

import { AgentRuntimeService, type AgentRuntimeTelemetryStatus } from '../../../core/app/runtime/agentRuntime';
import { buildFileAgentSystemPrompt } from '../../../core/features/system-prompt/filePromptConfig/buildFileAgentSystemPrompt';
import { DefaultToolRegistry } from '../../../core/features/tool-execution/toolRegistry';
import { getRepoVerificationContextNote } from '../../../core/shared/lib/repoMap';
import type { RuntimeEvent } from '../../../core/shared/types/types';
import type { AistDaemonServer } from '../AistDaemonServer';
import type { IsolationAgentRunInput } from '../isolation/IsolationSessionManager';
import { createFileBackedRuntimeChatRepository } from '../createFileBackedRuntimeChatRepository';
import { createIsolatedToolCallHandler } from '../isolation/runtime/createIsolatedToolCallHandler';
import { getDaemonModelOption } from '../modelOptions';

/**
 * Что это: запускает полноценный agent runtime для isolated session.
 * Зачем нужно: Docker/worktree lifecycle остаётся в isolation manager, а model/tool loop переиспользует core runtime.
 * Какую продуктовую проблему решает: закрытие VS Code не останавливает самостоятельного агента, а результат попадает в branch/PR.
 */
export async function runIsolationAgent(
  this: AistDaemonServer,
  input: IsolationAgentRunInput
): Promise<{ runId?: string; answer?: string }> {
  const modelClient = this.options.modelClient || this.createRoutingModelClient();
  const skills = await this.getConfiguredSkills();
  const config = await this.getRuntimeConfig();
  const chatId = input.session.chatId || `isolation-${input.session.sessionId}`;
  const toolRegistry = new DefaultToolRegistry();
  const chatRepository = createFileBackedRuntimeChatRepository({ repository: this.chatRepository });
  let finalStatus: AgentRuntimeTelemetryStatus | undefined;

  const runtime = new AgentRuntimeService({
    chatRepository,
    runRepository: this.runRepository,
    modelClient,
    auxiliaryModel: this.auxiliaryModel,
    toolRegistry,
    handleToolCall: createIsolatedToolCallHandler({
      registry: toolRegistry,
      worktreePath: input.worktreePath,
      containerName: input.containerName,
      dockerProvider: input.dockerProvider,
      emitLog: (level, message) => this.isolationSessions.log(input.session.sessionId, level, message),
      getSkills: () => this.getConfiguredSkills(),
      getAuxiliaryToolSettings: (toolName) => this.getAuxiliaryToolSettings(toolName),
      auxiliaryModel: this.auxiliaryModel,
      workspaceName: path.basename(input.worktreePath)
    }),
    configProvider: {
      getSnapshot: async () => ({
        ...(await this.getRuntimeConfig()),
        toolsDisabled: false
      })
    },
    promptProvider: {
      getSystemPrompt: async () =>
        [
          await buildFileAgentSystemPrompt({
            workspaceRoot: input.worktreePath,
            homeDir: this.homeDir,
            language: await this.getLanguage(),
            toolCallNotesRequired: config.toolCallNotesRequired,
            skills: skills.map(({ id, label, description }) => ({ id, label, description }))
          }),
          buildIsolationSystemPrompt(input)
        ].join('\n\n')
    },
    contextProviders: {
      getRepoContextNote: (prompt) => getRepoVerificationContextNote(input.worktreePath, prompt)
    },
    modelCatalog: {
      getOption: (modelId) => getDaemonModelOption({ modelId })
    },
    skillProvider: {
      getSkills: () => this.getConfiguredSkills()
    },
    workspaceRootProvider: {
      getWorkspaceRoot: () => input.worktreePath
    },
    eventSink: {
      emit: (event) => this.handleIsolationRuntimeEvent(input.session.sessionId, event)
    },
    logger: this.logger,
    concurrencyScope: 'chat',
    reflection: {
      enabled: false
    },
    hooks: {
      onRunFinished: async ({ runId, status }) => {
        finalStatus = status;
        this.unregisterActiveRun(runId);
        this.clearApprovalsForRun(runId);
        await this.broadcastStateChanged('isolation.run.finished', { chatId });
        await this.isolationSessions.log(
          input.session.sessionId,
          'info',
          `Agent run ${runId} finished with ${status}.`
        );
      }
    },
    now: this.now,
    idFactory: this.idFactory
  });
  input.registerStopHandler?.(() => runtime.stop());

  await this.isolationSessions.log(
    input.session.sessionId,
    'info',
    `Agent runtime started on ${input.session.branchName}.`
  );
  const result = await runtime.startAsk(chatId, input.session.prompt);
  if (!result.accepted) {
    throw new Error(result.error.message || 'Isolated agent run was not accepted.');
  }
  this.registerActiveRun({ runId: result.runId, chatId });
  await this.broadcastStateChanged('isolation.run.started', { chatId });
  await waitForIsolationRun({ getFinalStatus: () => finalStatus });
  if (finalStatus && finalStatus !== 'success') {
    throw new Error(`Isolated agent run finished with ${finalStatus}.`);
  }

  return { runId: result.runId, answer: (await this.chatRepository.get(chatId))?.lastAnswer };
}

export async function handleIsolationRuntimeEvent(
  this: AistDaemonServer,
  sessionId: string,
  event: RuntimeEvent
): Promise<void> {
  const message = formatIsolationRuntimeEvent(event);
  if (!message) {
    return;
  }

  await this.handleRuntimeEvent(event);
  if (shouldExposeRuntimeEventAsStage(event)) {
    await this.isolationSessions.setStage(sessionId, message);
  }
  await this.isolationSessions.log(sessionId, event.type === 'tool.call.failed' ? 'error' : 'info', message);
}

function buildIsolationSystemPrompt(input: IsolationAgentRunInput): string {
  return [
    'Isolated autonomous run instructions:',
    `- Work only inside the isolated git worktree: ${input.worktreePath}.`,
    '- Bash commands are executed inside the Docker container with /workspace mounted to that worktree.',
    '- Do not modify the original user workspace outside this worktree.',
    '- Do not create commits, push branches, or create pull requests manually; the daemon finalizer will do that.',
    `- Always create or update a reviewable markdown artifact at docs/aist-isolated-runs/${input.session.sessionId}.md.`,
    '- If the user asks a question or asks for analysis instead of code changes, write the complete answer into that markdown artifact.',
    '- If you implement code changes, also update that markdown artifact with a short summary and verification notes.',
    '- The isolated run is considered incomplete until at least one file is changed.',
    '- When implementation is complete, provide a concise summary of changed behavior and any verification you performed.',
    `- Current branch: ${input.session.branchName}.`
  ].join('\n');
}

/**
 * Что это: ожидает завершения фонового isolated runtime.
 * Зачем нужно: Docker lifecycle должен дождаться стандартного chat-run и только потом финализировать git/PR.
 * Какую продуктовую проблему решает: UI получает live-чат, но daemon не переходит к commit до финального ответа агента.
 */
async function waitForIsolationRun({
  getFinalStatus
}: {
  getFinalStatus: () => AgentRuntimeTelemetryStatus | undefined;
}): Promise<void> {
  while (!getFinalStatus()) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

function formatIsolationRuntimeEvent(event: RuntimeEvent): string | undefined {
  switch (event.type) {
    case 'run.started':
      return `Run ${event.run.id} started.`;
    case 'run.activity':
      return event.detail || `Activity: ${event.activity}.`;
    case 'model.request.updated':
      return `Model request: ${event.request.phase}.`;
    case 'tool.call.started':
      return `Tool started: ${event.toolCall.name}.`;
    case 'tool.call.completed':
      return `Tool completed: ${event.toolCall.name}.`;
    case 'tool.call.failed':
      return `Tool failed: ${event.toolCall.name}: ${event.error.message}`;
    case 'run.completed':
      return 'Agent produced a final answer.';
    case 'run.failed':
      return `Agent failed: ${event.error.message}`;
    case 'run.stopped':
      return event.reason ? `Agent stopped: ${event.reason}` : 'Agent stopped.';
    default:
      return undefined;
  }
}

function shouldExposeRuntimeEventAsStage(event: RuntimeEvent): boolean {
  return (
    event.type === 'run.activity' ||
    event.type === 'model.request.updated' ||
    event.type === 'tool.call.started' ||
    event.type === 'tool.call.completed' ||
    event.type === 'tool.call.failed'
  );
}
