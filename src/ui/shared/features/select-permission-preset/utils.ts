import type { useI18n } from '../../shared/i18n';
import type { ToolPermissionPreset, ToolPermissionPresetId } from '../../shared/types';

/**
 * Что это: вычисление описания выбранного preset для title select.
 * Зачем нужно: custom — виртуальное состояние без объекта preset, поэтому обрабатываем его явно и не засоряем JSX условиями.
 */
export function getSelectedDescription(
  presets: ToolPermissionPreset[],
  activeId: ToolPermissionPresetId | 'custom',
  t: ReturnType<typeof useI18n>['t']
): string {
  if (activeId === 'custom') {
    return t('settings.permission.customDescription');
  }

  const preset = presets.find((item) => item.id === activeId);
  return preset ? t(`settings.preset.${preset.id}.description` as never) : '';
}
