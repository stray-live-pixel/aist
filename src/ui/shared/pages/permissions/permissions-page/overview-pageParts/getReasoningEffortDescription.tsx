import type { useI18n } from '../../../../i18n';
import type { ReasoningEffort } from '../../../../types';

type Translate = ReturnType<typeof useI18n>['t'];

/**
 * Что это: поясняет, как режим рассуждения влияет на ответ агента.
 * Зачем нужно: техническая настройка становится понятной в продуктовых терминах.
 * Какую продуктовую проблему решает: пользователь осознанно оценивает скорость и качество следующего ответа.
 */
export function getReasoningEffortDescription({ effort, t }: { effort: ReasoningEffort; t: Translate }): string {
  if (effort === 'low') return t('settings.overview.reasoning.lowDescription');
  if (effort === 'medium') return t('settings.overview.reasoning.mediumDescription');
  if (effort === 'high') return t('settings.overview.reasoning.highDescription');
  if (effort === 'xhigh') return t('settings.overview.reasoning.xhighDescription');

  return t('settings.overview.reasoning.autoDescription');
}
