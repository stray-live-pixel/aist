import type { AgentState } from '../../../shared/types';

/**
 * Что это: проверяет, отличаются ли настройки модели чата от настроек по умолчанию.
 * Зачем нужно: reset-кнопка появляется только когда пользователю действительно есть что сбросить.
 * Какую проблему решает: UI не показывает лишнее действие и не создаёт ложного ощущения изменений.
 */
export function areModelSettingsEqual({
  left,
  right
}: {
  left: AgentState['activeChat']['modelSettings'];
  right: AgentState['defaultModelSettings'];
}): boolean {
  return (
    left.model === right.model &&
    left.reasoningEffort === right.reasoningEffort &&
    left.codexServiceTier === right.codexServiceTier &&
    left.maxToolIterations === right.maxToolIterations &&
    left.editorContextMode === right.editorContextMode &&
    left.streamingEnabled === right.streamingEnabled
  );
}
