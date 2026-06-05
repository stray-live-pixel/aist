import type { useI18n } from '../../../../i18n';
import type { AgentInstructionSource } from '../../../../types';

type Translate = ReturnType<typeof useI18n>['t'];

/**
 * Что это: переводит технический kind источника prompt в понятный тип.
 * Зачем нужно: пользователь должен понимать происхождение правила без знания архитектуры system prompt.
 * Какую продуктовую проблему решает: вместо непонятного «priority #40» UI показывает понятный источник правила.
 */
export function getInstructionSourceTypeLabel({ source, t }: { source: AgentInstructionSource; t: Translate }): string {
  if (source.kind === 'base') return t('settings.overview.instructions.type.base');
  if (source.kind === 'file') return t('settings.overview.instructions.type.file');
  if (source.kind === 'declarative') return t('settings.overview.instructions.type.declarative');
  if (source.kind === 'mode') return t('settings.overview.instructions.type.mode');
  if (source.kind === 'custom') return t('settings.overview.instructions.type.custom');
  if (source.kind === 'skills') return t('settings.overview.instructions.type.skills');

  return t('settings.overview.instructions.type.fallback');
}
