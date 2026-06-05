import type { TranslationKey } from '../../i18n';
import type { ModelOption } from '../../types';
import type { SelectOption } from '../../ui';

/**
 * Возвращает варианты усилия рассуждения для выбранной модели.
 *
 * OpenRouter получает только стандартные уровни, а Codex дополнительно получает
 * xhigh как максимальный режим рассуждения, потому что этот режим поддерживает
 * ChatGPT Codex Responses API.
 */
export function getReasoningOptions({
  t,
  model
}: {
  t: (key: TranslationKey) => string;
  model: ModelOption | undefined;
}): SelectOption[] {
  const baseOptions: SelectOption[] = [
    { value: 'auto', label: t('reasoning.auto') },
    { value: 'low', label: t('reasoning.low') },
    { value: 'medium', label: t('reasoning.medium') },
    { value: 'high', label: t('reasoning.high') }
  ];

  return model?.provider === 'codex' ? [...baseOptions, { value: 'xhigh', label: t('reasoning.xhigh') }] : baseOptions;
}
