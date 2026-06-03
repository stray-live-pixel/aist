import type { useI18n } from '../../../../shared/i18n';
import type { ToolPermissionPreset, ToolPermissionPresetId } from '../../../../shared/types';

type Translate = ReturnType<typeof useI18n>['t'];

/**
 * Что это: находит понятное имя активного профиля разрешений.
 * Зачем нужно: технический id профиля не объясняет пользователю, какой уровень доступа выбран.
 * Какую продуктовую проблему решает: обзор показывает смысл настройки безопасности, а не внутренний идентификатор.
 */
export function getPermissionPresetLabel({
  presets,
  activeId,
  t
}: {
  presets: ToolPermissionPreset[];
  activeId: ToolPermissionPresetId | 'custom';
  t: Translate;
}): string {
  if (activeId === 'custom') return t('settings.overview.permissionsCustom');

  return presets.find((preset) => preset.id === activeId)?.label || activeId;
}
