import type { useI18n } from '../../../../shared/i18n';
import type { ToolPermissionPreset, ToolPermissionPresetId } from '../../../../shared/types';

type Translate = ReturnType<typeof useI18n>['t'];

/**
 * Что это: возвращает короткое объяснение активного профиля доступа инструментов.
 * Зачем нужно: пользователь должен понимать не только название профиля, но и его смысл для безопасности.
 * Какую продуктовую проблему решает: обзор помогает оценить, насколько самостоятельно агент сможет действовать.
 */
export function getPermissionPresetDescription({
  presets,
  activeId,
  t
}: {
  presets: ToolPermissionPreset[];
  activeId: ToolPermissionPresetId | 'custom';
  t: Translate;
}): string {
  if (activeId === 'custom') return t('settings.overview.permissionsCustomDescription');

  return (
    presets.find((preset) => preset.id === activeId)?.description || t('settings.overview.permissionsPresetFallback')
  );
}
