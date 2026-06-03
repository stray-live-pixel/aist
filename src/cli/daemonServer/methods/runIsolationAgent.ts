import type { RuntimeEvent } from '../../../core/shared/types/types';
import type { AistDaemonServer } from '../AistDaemonServer';
import type { IsolationAgentRunInput } from '../isolation/IsolationSessionManager';
import { applyRuntimeEventToChat } from '../isolation/runtime/applyRuntimeEventToChat';
import { createContainerAgentPrompt } from '../isolation/runtime/createContainerAgentPrompt';
import { createContainerChat } from '../isolation/runtime/createContainerChat';
import { runContainerAgentCli } from '../isolation/runtime/runContainerAgentCli';

/**
 * Что это: запускает AIST agent как headless CLI внутри автономного Docker-контейнера.
 * Зачем нужно: контейнер сам клонирует GitHub repo, ставит AIST и работает в своей ветке без bind mount host worktree.
 * Какую продуктовую проблему решает: isolated agents становятся готовыми к будущему запуску на удалённых серверах.
 */
export async function runIsolationAgent(
  this: AistDaemonServer,
  input: IsolationAgentRunInput
): Promise<{ runId?: string; answer?: string }> {
  const chatId = input.session.chatId || `isolation-${input.session.sessionId}`;
  const modelSettings = await this.getDefaultChatModelSettings();
  const containerChatId = await createContainerChat({
    dockerProvider: input.dockerProvider,
    containerName: input.containerName,
    modelSettings
  });

  await this.chatRepository.setBusy(chatId, true);
  await this.isolationSessions.log(
    input.session.sessionId,
    'info',
    `Container AIST CLI started on ${input.session.branchName}.`
  );
  const result = await runContainerAgentCli({
    dockerProvider: input.dockerProvider,
    containerName: input.containerName,
    chatId: containerChatId,
    prompt: createContainerAgentPrompt({ input }),
    onLog: (level, message) => this.isolationSessions.log(input.session.sessionId, level, message),
    onEvent: (event) => this.handleContainerIsolationEvent({ sessionId: input.session.sessionId, chatId, event }),
    registerStopHandler: input.registerStopHandler
  });
  await this.broadcastStateChanged('isolation.run.finished', { chatId });

  return { runId: result.runId, answer: result.answer || (await this.chatRepository.get(chatId))?.lastAnswer };
}

/**
 * Что это: импортирует runtime event из контейнера в локальный daemon и webview.
 * Зачем нужно: чат и lifecycle остаются на компьютере пользователя, а выполнение уже полностью внутри Docker clone.
 * Какую продуктовую проблему решает: state чата можно получать локально и в будущем через сетевой канал от remote runner.
 */
export async function handleContainerIsolationEvent(
  this: AistDaemonServer,
  {
    sessionId,
    chatId,
    event
  }: {
    sessionId: string;
    chatId: string;
    event: RuntimeEvent;
  }
): Promise<void> {
  const localEvent = await applyRuntimeEventToChat({ server: this, event, localChatId: chatId });
  if (localEvent.type === 'run.started') {
    this.registerActiveRun({ runId: localEvent.run.id, chatId });
  }
  if (localEvent.type === 'run.finished' || localEvent.type === 'run.failed' || localEvent.type === 'run.stopped') {
    const runId = localEvent.type === 'run.finished' ? localEvent.run.id : localEvent.runId;
    this.unregisterActiveRun(runId);
    this.clearApprovalsForRun(runId);
  }
  await this.handleIsolationRuntimeEvent(sessionId, localEvent);
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
