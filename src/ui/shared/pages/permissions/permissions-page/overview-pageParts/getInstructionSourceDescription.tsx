import type { useI18n } from '../../../../i18n';
import type { AgentInstructionSource } from '../../../../types';

type Translate = ReturnType<typeof useI18n>['t'];

/**
 * Что это: объясняет назначение источника инструкций простым продуктовым языком.
 * Зачем нужно: обзор должен отвечать на вопрос «зачем агент это получает», а не только перечислять файлы.
 * Какую продуктовую проблему решает: пользователь понимает влияние каждого правила на следующий ответ агента.
 */
export function getInstructionSourceDescription({
  source,
  t
}: {
  source: AgentInstructionSource;
  t: Translate;
}): string {
  if (source.kind === 'base') return t('settings.overview.instructions.baseDescription');
  if (source.kind === 'file') return t('settings.overview.instructions.fileDescription');
  if (source.kind === 'declarative') return t('settings.overview.instructions.declarativeDescription');
  if (source.kind === 'mode') return t('settings.overview.instructions.modeDescription');
  if (source.kind === 'custom') return t('settings.overview.instructions.customDescription');
  if (source.kind === 'skills') return t('settings.overview.instructions.skillsDescription');

  return t('settings.overview.instructions.fallbackDescription');
}
