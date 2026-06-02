import type { ToolRunnerRuntime } from './ToolRunnerRuntime';
import { emitToolStarted } from './events';
import type { ToolRunnerHandleParams } from './types';

/**
 * Что это: входные данные для стартового tool message.
 * Зачем нужно: tool lifecycle передаёт в UI уже нормализованные args/reason/nextStep.
 * Какую продуктовую проблему решает: пользователь сразу видит, какой tool собирается выполнить агент.
 */
export type AppendInitialToolMessageInput = {
  runtime: ToolRunnerRuntime;
  params: ToolRunnerHandleParams;
  toolName: string;
  args: Record<string, unknown>;
  reason: string;
  nextStep: string | undefined;
  runId: string | undefined;
};

/**
 * Что это: создаёт initial tool message и event started.
 * Зачем нужно: UI сразу показывает waiting tool row до approval или выполнения.
 * Какую продуктовую проблему решает: пользователь видит прогресс agent run без паузы перед tool approval.
 */
export async function appendInitialToolMessage(input: AppendInitialToolMessageInput) {
  const { runtime, params, toolName, args, reason, nextStep, runId } = input;
  const toolMessage = await runtime.deps.context.appendToolMessage(params.chat.id, {
    role: 'tool',
    name: toolName,
    status: 'waiting',
    reason,
    nextStep,
    args
  });
  await runtime.deps.context.setActivity(
    params.chat.id,
    'thinking',
    runtime.activityFormatter.prepare(toolName, reason)
  );
  await emitToolStarted({ runtime, params, runId, messageId: toolMessage.id, args, reason, nextStep });
  runtime.deps.context.sendState?.();
  return toolMessage;
}
