import type { ModelRequestLifecycleCallbacks } from '../../../shared/types/types';
import { updateModelRequest } from './actions';
import type { AgentRuntimeContext } from './context';

/**
 * Что это: создаёт callbacks жизненного цикла HTTP/model request.
 * Зачем нужно: headers от provider сразу обновляют phase/status model request в чате.
 * Какую продуктовую проблему решает: пользователь видит failed/streaming/receiving ещё до полного завершения запроса.
 */
export function createModelRequestLifecycle({
  context,
  runId,
  chatId,
  streamingEnabled
}: {
  context: AgentRuntimeContext;
  runId: string;
  chatId: string;
  streamingEnabled: boolean;
}): ModelRequestLifecycleCallbacks {
  return {
    onResponseHeaders: (info) => {
      void updateModelRequest({
        context,
        runId,
        chatId,
        patch: {
          phase: info.status >= 400 ? 'failed' : streamingEnabled ? 'streaming' : 'receiving',
          httpStatus: info.status,
          httpStatusText: info.statusText,
          updatedAt: context.now()
        }
      });
    }
  };
}
