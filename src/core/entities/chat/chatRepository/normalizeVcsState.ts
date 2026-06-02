import { removeUndefined } from '../../../shared/lib/fileRepository';
import type { ChatVcsState } from '../../../shared/types/types';

/**
 * Что это: нормализация VCS-состояния, привязанного к чату.
 * Зачем нужно: continuation/isolated-сценарии должны читать только валидную ветку и команду.
 * Какую продуктовую проблему решает: чат не восстанавливает некорректный git-контекст из повреждённого файла.
 */
export function normalizeVcsState({ value }: { value: unknown }): ChatVcsState | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const state = value as Partial<ChatVcsState>;
  if (typeof state.command !== 'string' || typeof state.branch !== 'string') {
    return undefined;
  }

  return removeUndefined({
    command: state.command,
    branch: state.branch,
    baseBranch: typeof state.baseBranch === 'string' ? state.baseBranch : undefined,
    isolated: Boolean(state.isolated)
  });
}
