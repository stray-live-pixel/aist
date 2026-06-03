import type { useI18n } from '../../../../shared/i18n';
import type { ReasoningEffort } from '../../../../shared/types';

type Translate = ReturnType<typeof useI18n>['t'];

/**
 * Что это: человекочитаемая подпись глубины рассуждения модели.
 * Зачем нужно: overview должен быть понятен без знания API-параметров провайдера.
 * Какую продуктовую проблему решает: пользователь видит ожидаемый баланс скорости и вдумчивости ответа.
 */
export function getReasoningEffortLabel({ effort, t }: { effort: ReasoningEffort; t: Translate }): string {
  if (effort === 'low') return t('settings.overview.reasoning.low');
  if (effort === 'medium') return t('settings.overview.reasoning.medium');
  if (effort === 'high') return t('settings.overview.reasoning.high');
  if (effort === 'xhigh') return t('settings.overview.reasoning.xhigh');

  return t('settings.overview.reasoning.auto');
}
