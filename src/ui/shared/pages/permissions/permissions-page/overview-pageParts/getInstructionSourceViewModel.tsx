import type { useI18n } from '../../../../shared/i18n';
import type { AgentInstructionSource } from '../../../../shared/types';
import type { SettingsPageId } from '../types';
import type { InstructionSourceSkillViewModel, InstructionSourceViewModel } from './InstructionSourceViewModel';
import { getInstructionSourceDescription } from './getInstructionSourceDescription';
import { getInstructionSourceTitle } from './getInstructionSourceTitle';
import { getInstructionSourceTone } from './getInstructionSourceTone';
import { getInstructionSourceTypeLabel } from './getInstructionSourceTypeLabel';

const PREVIEW_LIMIT = 220;
type Translate = ReturnType<typeof useI18n>['t'];

/**
 * Что это: превращает backend-источник prompt в понятную карточку обзора.
 * Зачем нужно: presentation-компоненты не должны знать про priority, kind и технические source-id.
 * Какую продуктовую проблему решает: обзор остаётся читаемым и не пугает пользователя внутренними деталями.
 */
export function getInstructionSourceViewModel({
  source,
  t
}: {
  source: AgentInstructionSource;
  t: Translate;
}): InstructionSourceViewModel {
  const title = getInstructionSourceTitle({ source, t });
  const typeLabel = getInstructionSourceTypeLabel({ source, t });
  const description = getInstructionSourceDescription({ source, t });
  const content = source.content.trim();
  const originLabel = getInstructionSourceOriginLabel({ source, t });
  const settingsPage = getInstructionSettingsPage({ source });

  return {
    id: source.id,
    kind: source.kind,
    title,
    typeLabel,
    shortDescription: description,
    fullDescription: originLabel ? `${description} ${originLabel}` : description,
    originLabel,
    content,
    preview: getInstructionPreview({ content }),
    badgeTone: getInstructionSourceTone({ source }),
    canOpenFullText: source.kind !== 'base' && Boolean(content),
    isLong: content.length > PREVIEW_LIMIT,
    settingsPage,
    settingsActionLabel: getInstructionSettingsActionLabel({ settingsPage, t }),
    skills: getInstructionSkills({ source })
  };
}

/**
 * Что это: короткое превью инструкции без резкого обрыва в середине слова.
 * Зачем нужно: карточка остаётся компактной, но пользователь сразу понимает содержание правила.
 * Какую продуктовую проблему решает: длинные инструкции не превращаются в непонятную строку с многоточием.
 */
function getInstructionPreview({ content }: { content: string }): string {
  const compactContent = content.replace(/\s+/g, ' ').trim();

  if (compactContent.length <= PREVIEW_LIMIT) {
    return compactContent;
  }

  const safeCut = compactContent.lastIndexOf(' ', PREVIEW_LIMIT);
  const cutAt = safeCut > PREVIEW_LIMIT * 0.75 ? safeCut : PREVIEW_LIMIT;

  return `${compactContent.slice(0, cutAt).trim()}…`;
}

/**
 * Что это: объясняет, откуда взялся источник инструкции, без показа непонятного priority.
 * Зачем нужно: пользователь видит происхождение правила и понимает, где искать подробную настройку.
 * Какую продуктовую проблему решает: техническое поле source становится полезным пояснением, а не загадочным id.
 */
function getInstructionSourceOriginLabel({
  source,
  t
}: {
  source: AgentInstructionSource;
  t: Translate;
}): string | undefined {
  if (!source.source) {
    return undefined;
  }

  if (source.kind === 'file') {
    return t('settings.overview.instructions.origin.file', { source: source.source });
  }

  if (source.kind === 'declarative') {
    return t('settings.overview.instructions.origin.declarative', { source: source.source });
  }

  if (source.kind === 'custom') {
    return source.source.startsWith('global:')
      ? t('settings.overview.instructions.origin.customGlobal')
      : t('settings.overview.instructions.origin.customProject');
  }

  if (source.kind === 'mode') {
    return source.source.startsWith('global:')
      ? t('settings.overview.instructions.origin.modeGlobal')
      : t('settings.overview.instructions.origin.modeProject');
  }

  if (source.kind === 'skills') {
    return t('settings.overview.instructions.origin.skills');
  }

  return undefined;
}

/**
 * Что это: выбирает раздел настроек, где пользователь может изменить источник правила.
 * Зачем нужно: обзор не дублирует редакторы, а ведёт к правильному месту настройки.
 * Какую продуктовую проблему решает: пользователь не остаётся с вопросом «где это исправить?».
 */
function getInstructionSettingsPage({ source }: { source: AgentInstructionSource }): SettingsPageId {
  if (source.kind === 'mode') return 'modes';
  if (source.kind === 'skills') return 'skills';
  if (source.kind === 'custom') return 'instructions';
  if (source.kind === 'file' || source.kind === 'declarative') return 'instructions';

  return 'system';
}

/**
 * Что это: человекочитаемый текст действия для перехода из карточки правила.
 * Зачем нужно: кнопка должна говорить, что откроется дальше, а не просто «перейти».
 * Какую продуктовую проблему решает: навигация из обзора становится предсказуемой.
 */
function getInstructionSettingsActionLabel({
  settingsPage,
  t
}: {
  settingsPage: SettingsPageId;
  t: Translate;
}): string {
  if (settingsPage === 'modes') return t('settings.overview.action.roles');
  if (settingsPage === 'skills') return t('settings.overview.action.skills');
  if (settingsPage === 'instructions') return t('settings.overview.action.instructions');

  return t('settings.overview.action.settings');
}

/**
 * Что это: structured список навыков внутри источника инструкций.
 * Зачем нужно: view model уже поддерживает отдельные карточки навыков,
 * но текущий backend передаёт skills-source как обычный текст prompt без массива навыков.
 * Какую продуктовую проблему решает: overview остаётся типобезопасным и готовым к будущему structured payload,
 * не создавая второй источник правды через парсинг markdown-текста.
 */
function getInstructionSkills({ source }: { source: AgentInstructionSource }): InstructionSourceSkillViewModel[] {
  if (source.kind !== 'skills') {
    return [];
  }

  return [];
}
