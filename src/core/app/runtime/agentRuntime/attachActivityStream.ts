import type { AgentRun } from '../../../shared/types/types';
import { setActivity, setActivityDetail } from './actions';
import type { AgentRuntimeContext } from './context';
import { createActivityStream } from './createActivityStream';

/**
 * Что это: подготавливает activity stream для run после старта.
 * Зачем нужно: streaming delta модели агрегируются в короткие live activity updates.
 * Какую продуктовую проблему решает: пользователь видит живой preview ответа без перегрузки UI событиями.
 */
export function attachActivityStream({
  context,
  chatId,
  runId,
  run
}: {
  context: AgentRuntimeContext;
  chatId: string;
  runId: string;
  run: AgentRun<unknown>;
}): void {
  run.activityStream = createActivityStream({
    now: context.now,
    text: context.text,
    setActivity: (activity, detail) => {
      void setActivity({ context, runId, chatId, activity, detail });
    },
    setActivityDetail: (detail) => {
      void setActivityDetail({ context, runId, chatId, detail });
    }
  });
}
