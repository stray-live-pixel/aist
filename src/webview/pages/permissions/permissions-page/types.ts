import type { ReactNode } from 'react';

import type { useI18n } from '../../../shared/i18n';

/**
 * Что это: идентификатор раздела настроек в левой навигации.
 * Зачем нужно: один union синхронизирует sidebar, заголовок страницы и switch основного контента.
 */
export type SettingsPageId =
  | 'overview'
  | 'instructions'
  | 'presets'
  | 'modes'
  | 'skills'
  | 'memory'
  | 'permissions'
  | 'notifications'
  | 'compaction'
  | 'system';

/**
 * Что это: props верхнего контейнера страницы настроек.
 * Зачем нужно: данные настроек берутся из AgentStateContext, а props оставляют только layout-сценарий и навигацию назад.
 */
export type PermissionsPageProps = {
  onBack?(): void;
  variant?: 'page' | 'embedded';
  initialPage?: SettingsPageId;
};

/**
 * Что это: описание пункта навигации настроек.
 * Зачем нужно: label/description берутся из i18n, а icon создаётся один раз в конфиге навигации.
 */
export type SettingsNavItem = {
  id: SettingsPageId;
  labelKey: ReturnType<typeof useI18n>['t'] extends (key: infer Key, ...args: never[]) => string ? Key : never;
  icon: ReactNode;
  descriptionKey: ReturnType<typeof useI18n>['t'] extends (key: infer Key, ...args: never[]) => string ? Key : never;
};

/**
 * Что это: группа пунктов sidebar с собственным заголовком.
 * Зачем нужно: поведение агента визуально отделено от системных настроек без дублирования рендера кнопок.
 */
export type SettingsNavGroup = {
  titleKey: ReturnType<typeof useI18n>['t'] extends (key: infer Key, ...args: never[]) => string ? Key : never;
  items: SettingsNavItem[];
};
