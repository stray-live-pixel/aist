import type { useI18n } from '../../../../i18n';
import type { AgentInstructionSource } from '../../../../types';

type Translate = ReturnType<typeof useI18n>['t'];

/**
 * Что это: выбирает короткое понятное имя источника инструкции.
 * Зачем нужно: backend title иногда содержит технические префиксы вроде Global instruction или Project mode.
 * Какую продуктовую проблему решает: список активных правил читается как обзор, а не как диагностика prompt.
 */
export function getInstructionSourceTitle({ source, t }: { source: AgentInstructionSource; t: Translate }): string {
  if (source.kind === 'base') return t('settings.overview.instructions.baseTitle');
  if (source.kind === 'skills') return t('settings.overview.instructions.skillsTitle');
  if (source.kind === 'file') return source.source || source.title;
  if (source.kind === 'declarative') return source.title;

  return source.title
    .replace(/^Global instruction: /, '')
    .replace(/^Project instruction: /, '')
    .replace(/^Global mode: /, '')
    .replace(/^Project mode: /, '');
}
