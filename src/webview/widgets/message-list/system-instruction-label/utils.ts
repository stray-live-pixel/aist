import { useI18n } from '../../../shared/i18n';
import type { AgentInstructionSource, AgentItemRef, AgentMode, AgentPromptConfig } from '../../../shared/types';

const CHIP_MAX_LENGTH = 16;

/**
 * Что это: собирает chips для компактной кнопки системных инструкций.
 * Зачем нужно: приоритетнее показывать выбранные пользователем инструкции и режим, а не технические source-блоки.
 */
export function getInstructionChips(promptConfig: AgentPromptConfig, sources: AgentInstructionSource[]) {
  const activeItems = promptConfig.activeInstructionRefs
    .map((ref) => findInstruction(promptConfig, ref))
    .filter((item): item is NonNullable<ReturnType<typeof findInstruction>> => Boolean(item))
    .map((item) => ({ key: refKey(item), label: item.label }));
  const mode = promptConfig.activeModeRef ? findMode(promptConfig, promptConfig.activeModeRef) : undefined;
  const chips = [...activeItems, ...(mode ? [{ key: `mode:${refKey(mode)}`, label: mode.label }] : [])];

  return chips.length ? chips : sources.map((source) => ({ key: source.id, label: source.title }));
}

/**
 * Что это: fallback-источник, когда extension не прислал итоговые источники.
 * Зачем нужно: кнопка не должна пустеть, иначе пользователь теряет связь с выбранным режимом.
 */
export function getFallbackSources(
  mode: AgentMode | undefined,
  t: ReturnType<typeof useI18n>['t']
): AgentInstructionSource[] {
  return [
    {
      id: 'mode-fallback',
      title: mode?.label ? t('systemInstructions.mode', { mode: mode.label }) : t('systemInstructions.fallbackTitle'),
      content: mode?.instructions.trim() || t('systemInstructions.noAdditional'),
      priority: 50,
      kind: 'mode'
    }
  ];
}

/**
 * Что это: короткая подпись chip без разрыва верстки.
 * Зачем нужно: названия инструкций могут быть длинными, а label живёт в sticky-шапке чата.
 */
export function truncateChip(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > CHIP_MAX_LENGTH ? `${normalized.slice(0, CHIP_MAX_LENGTH - 3).trimEnd()}...` : normalized;
}

function findInstruction(promptConfig: AgentPromptConfig, ref: AgentItemRef) {
  return [...promptConfig.globalInstructions, ...promptConfig.localInstructions].find(
    (item) => refKey(item) === refKey(ref)
  );
}

function findMode(promptConfig: AgentPromptConfig, ref: AgentItemRef) {
  return [...promptConfig.globalModes, ...promptConfig.localModes].find((item) => refKey(item) === refKey(ref));
}

function refKey(ref: AgentItemRef): string {
  return `${ref.scope}:${ref.id}`;
}
