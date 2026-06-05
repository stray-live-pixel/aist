import type { ToolPermissionItem } from '../../shared/types';

/**
 * Что это: props строки настройки доступа к одному инструменту.
 * Зачем нужно: компонент работает с готовой display model из AgentState и сам отправляет изменение permission через IPC.
 */
export type ToolPermissionSelectProps = {
  /** Инструмент, его текущее право и дефолтное право для подсказки пользователю. */
  item: ToolPermissionItem;
};
