import type { AgentRuntimeContext } from '../context';
import type { AgentRuntimeConfigSnapshot } from '../types';

/**
 * Что это: нормализует runtime config snapshot.
 * Зачем нужно: model loop получает числа/flags в безопасном формате.
 * Какую продуктовую проблему решает: некорректная настройка max iterations не ломает запуск агента.
 */
export async function getConfig({ context }: { context: AgentRuntimeContext }): Promise<AgentRuntimeConfigSnapshot> {
  const snapshot = await context.deps.configProvider.getSnapshot();
  return {
    maxToolIterations: Number.isFinite(snapshot.maxToolIterations)
      ? Math.max(0, Math.floor(snapshot.maxToolIterations))
      : 0,
    streamingEnabled: Boolean(snapshot.streamingEnabled),
    disabledProjectToolIds: snapshot.disabledProjectToolIds || [],
    auxiliaryModelToolEnabled: snapshot.auxiliaryModelToolEnabled === true
  };
}
