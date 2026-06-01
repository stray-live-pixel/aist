import type { SubagentModelClient, SubagentRunResult, SubagentTask } from './types';

/**
 * Что это: общий исполнитель субагентов.
 * Зачем нужно: продукт может добавлять новых помощников, а параллельный запуск и обработка ошибок остаются едиными.
 */
export async function runSubagents<TResult>(input: {
  tasks: SubagentTask<TResult>[];
  modelClient: SubagentModelClient;
  signal?: AbortSignal;
}): Promise<Array<SubagentRunResult<TResult>>> {
  return Promise.all(
    input.tasks.map((task) => runSubagent({ task, modelClient: input.modelClient, signal: input.signal }))
  );
}

/**
 * Что это: запуск одного субагента с безопасным fallback.
 * Зачем нужно: сбой вспомогательного анализа не должен ломать основной пользовательский запрос.
 */
async function runSubagent<TResult>(input: {
  task: SubagentTask<TResult>;
  modelClient: SubagentModelClient;
  signal?: AbortSignal;
}): Promise<SubagentRunResult<TResult>> {
  try {
    const request = input.task.buildRequest();
    const response = await input.modelClient.chat(request.messages, undefined, request.model, input.signal);
    return {
      taskId: input.task.id,
      label: input.task.label,
      status: 'success',
      result: input.task.parseResponse(response)
    };
  } catch (error) {
    if (input.task.fallback) {
      return {
        taskId: input.task.id,
        label: input.task.label,
        status: 'fallback',
        result: input.task.fallback(error),
        error: getErrorMessage({ error })
      };
    }

    return {
      taskId: input.task.id,
      label: input.task.label,
      status: 'error',
      error: getErrorMessage({ error })
    };
  }
}

/**
 * Что это: приводит любую ошибку субагента к короткому тексту для логов и диагностики.
 * Зачем нужно: UI и логи не должны падать из-за нестандартных Error-like объектов.
 */
function getErrorMessage(input: { error: unknown }): string {
  return input.error instanceof Error ? input.error.message : String(input.error);
}
