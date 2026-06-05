import type { AgentState } from '../../../shared/types';

/**
 * Что это: находит активную роль агента по ref из prompt config.
 * Зачем нужно: summary показывает, в каком режиме сейчас отвечает агент.
 * Какую проблему решает: пользователь видит продуктовый профиль без открытия settings.
 */
export function getActiveRoleLabel({ state, fallback }: { state: AgentState; fallback: string }): string {
  const roleRef = state.promptConfig.activeModeRef;
  if (!roleRef) return fallback;
  const role = [...state.promptConfig.globalModes, ...state.promptConfig.localModes].find(
    (mode) => mode.scope === roleRef.scope && mode.id === roleRef.id
  );
  return role?.label || fallback;
}

/**
 * Что это: находит активный preset инструкций.
 * Зачем нужно: composer summary объясняет, какой набор инструкций влияет на ответ.
 * Какую проблему решает: настройки prompt становятся видимыми без лишней навигации.
 */
export function getActivePresetLabel({ state, fallback }: { state: AgentState; fallback: string }): string {
  if (!state.promptConfig.activePresetId) return fallback;
  return (
    state.promptConfig.presets.find((preset) => preset.id === state.promptConfig.activePresetId)?.label || fallback
  );
}

/**
 * Что это: собирает короткую подпись роли, preset и числа инструкций.
 * Зачем нужно: одна compact-кнопка заменяет длинное описание профиля агента.
 * Какую проблему решает: пользователь видит состав профиля, а UI остаётся компактным.
 */
export function formatInstructionProfileLabel({
  role,
  preset,
  instructionCount
}: {
  role: string;
  preset: string;
  instructionCount: number;
}): string {
  const normalizedPreset = preset.trim();
  const suffix = instructionCount ? ` +${instructionCount}` : '';
  if (!normalizedPreset || /^no preset|активный пресет не выбран/i.test(normalizedPreset)) {
    return `${role}${suffix}`;
  }

  return `${role} / ${normalizedPreset}${suffix}`;
}
