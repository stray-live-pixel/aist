import type { ModelOption } from '../../../types';
import type { SelectOption } from '../../../ui';

/**
 * Что это: возвращает варианты ускорения только для Codex-моделей с объявленной поддержкой.
 * Зачем нужно: UI не предлагает priority для OpenRouter и неподдерживаемых Codex-моделей.
 * Какую проблему решает: пользователь не выбирает режим, который backend может отклонить.
 */
export function getCodexServiceTierOptions({ model }: { model: ModelOption | undefined }): SelectOption[] | undefined {
  if (model?.provider !== 'codex' || !model.codexServiceTiers?.includes('priority')) {
    return undefined;
  }

  return [
    { value: 'auto', label: 'normal' },
    { value: 'priority', label: 'priority' }
  ];
}
