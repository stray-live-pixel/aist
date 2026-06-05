import type { ToolPermissionPreset, ToolPermissionPresetId } from '../../types';

/**
 * Что это: props выбора preset доступа к инструментам.
 * Зачем нужно: компонент отображает список preset и отправляет IPC только при выборе не-custom значения.
 */
export type PermissionPresetSelectProps = {
  /** Все доступные preset, которые можно применить к текущему workspace/user scope. */
  presets: ToolPermissionPreset[];
  /** Активный preset или virtual value custom, если текущие permissions не совпадают с preset. */
  activeId: ToolPermissionPresetId | 'custom';
  /** Отключает select, когда изменение прав временно запрещено. */
  disabled?: boolean;
  /** Внешний класс только для layout родителя; внутренний вид задаёт module.scss. */
  className?: string;
};
