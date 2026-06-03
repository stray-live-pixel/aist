import { DEFAULT_MODEL } from '../../../core/entities/model/modelDefaults';
import type { ToolRunnerSpawnAgentInput } from '../../../core/features/tool-execution/toolRunner';
import type { AistDaemonServer } from '../AistDaemonServer';
import { formatError } from '../formatError';
import { createAgentMessages } from './createAgentMessages';
import { createInitialRunMessages } from './createInitialRunMessages';
import { runSpawnedAgent } from './runSpawnedAgent';

/**
 * Что это: запускает дочернего ИИ-агента для tool spawn_agent.
 * Зачем нужно: основная модель может делегировать отдельное исследование и либо ждать ответ, либо продолжить работу.
 * Какую продуктовую проблему решает: большие задачи ускоряются параллельными помощниками без смешивания их истории с основным чатом.
 */
export async function spawnAgent(
  this: AistDaemonServer,
  input: ToolRunnerSpawnAgentInput
): Promise<Record<string, unknown>> {
  const settings = await this.getAuxiliaryToolSettings('spawn_agent');
  const model = input.model || settings.model || DEFAULT_MODEL;
  const allowTools = typeof input.allowTools === 'boolean' ? input.allowTools : settings.allowTools;
  const title = input.title || 'Дочерний агент';
  const startedAt = this.now();
  const messages = createAgentMessages({ input, model });
  const run = await this.subagentRepository.create({
    parentChatId: input.parentChatId,
    kind: 'agent.task',
    mode: 'agent_loop',
    title,
    status: 'running',
    model,
    history: messages,
    messages: createInitialRunMessages({
      runId: '',
      parentChatId: input.parentChatId,
      startedAt,
      title,
      prompt: input.prompt
    }),
    includeResultInParentModelContext: input.mode === 'wait',
    startedAt
  });

  await this.subagentRepository.update(run.id, {
    messages: createInitialRunMessages({
      runId: run.id,
      parentChatId: input.parentChatId,
      startedAt,
      title,
      prompt: input.prompt
    })
  });
  void this.broadcastStateChanged('subagent.spawn.started', { chatId: input.parentChatId });

  const task = runSpawnedAgent({ server: this, input, runId: run.id, messages, model, allowTools, startedAt });
  if (input.mode === 'background') {
    task.catch((error) =>
      this.logger.warn('Background spawned agent failed', { runId: run.id, error: formatError({ error }) })
    );
    return {
      ok: true,
      mode: 'background',
      subagentRunId: run.id,
      title,
      status: 'running',
      message: 'Дочерний агент запущен в фоне. Основной агент может продолжать работу.'
    };
  }

  return task;
}
