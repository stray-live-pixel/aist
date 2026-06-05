import type { ModelOption } from '../../../types';
import type { SelectOption } from '../../../ui';

/**
 * Что это: возвращает варианты reasoning effort для выбранной модели.
 * Зачем нужно: Codex поддерживает дополнительный xhigh, а другие провайдеры нет.
 * Какую проблему решает: UI не предлагает пользователю неподдерживаемую глубину reasoning.
 */
export function getReasoningOptions({ model }: { model: ModelOption | undefined }): SelectOption[] {
  const baseOptions: SelectOption[] = [
    { value: 'auto', label: 'auto' },
    { value: 'low', label: 'low' },
    { value: 'medium', label: 'medium' },
    { value: 'high', label: 'high' }
  ];

  return model?.provider === 'codex' ? [...baseOptions, { value: 'xhigh', label: 'xhigh' }] : baseOptions;
}
