import {
  BarChart3,
  BellRing,
  Brain,
  FileText,
  Gauge,
  KeyRound,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  Wrench,
  Zap
} from 'lucide-react';

import type { SettingsNavGroup, SettingsNavItem } from './types';

/**
 * Что это: панель разделов, описывающих поведение агента.
 * Зачем нужно: порядок «Навыки → Роли → Инструкции → Пресеты» задан продуктовым требованием и не должен зависеть от общего списка настроек.
 */
export const BEHAVIOR_NAV_ITEMS: SettingsNavItem[] = [
  {
    id: 'skills',
    labelKey: 'settings.nav.skills',
    icon: <Wrench size={15} />,
    descriptionKey: 'settings.nav.skillsDescription'
  },
  {
    id: 'modes',
    labelKey: 'settings.nav.modes',
    icon: <UserRound size={15} />,
    descriptionKey: 'settings.nav.modesDescription'
  },
  {
    id: 'instructions',
    labelKey: 'settings.nav.instructions',
    icon: <FileText size={15} />,
    descriptionKey: 'settings.nav.instructionsDescription'
  },
  {
    id: 'presets',
    labelKey: 'settings.nav.presets',
    icon: <Zap size={15} />,
    descriptionKey: 'settings.nav.presetsDescription'
  },
  {
    id: 'memory',
    labelKey: 'settings.nav.memory',
    icon: <Brain size={15} />,
    descriptionKey: 'settings.nav.memoryDescription'
  }
];

/**
 * Что это: остальные разделы страницы настроек.
 * Зачем нужно: отделяем общие настройки от поведения агента, но оставляем единый контракт item для header и sidebar.
 */
export const GENERAL_NAV_ITEMS: SettingsNavItem[] = [
  {
    id: 'overview',
    labelKey: 'settings.nav.overview',
    icon: <SlidersHorizontal size={15} />,
    descriptionKey: 'settings.nav.overviewDescription'
  },
  {
    id: 'permissions',
    labelKey: 'settings.nav.permissions',
    icon: <ShieldCheck size={15} />,
    descriptionKey: 'settings.nav.permissionsDescription'
  },
  {
    id: 'notifications',
    labelKey: 'settings.nav.notifications',
    icon: <BellRing size={15} />,
    descriptionKey: 'settings.nav.notificationsDescription'
  },
  {
    id: 'telemetry',
    labelKey: 'settings.nav.telemetry',
    icon: <BarChart3 size={15} />,
    descriptionKey: 'settings.nav.telemetryDescription'
  },
  {
    id: 'compaction',
    labelKey: 'settings.nav.compaction',
    icon: <Gauge size={15} />,
    descriptionKey: 'settings.nav.compactionDescription'
  },
  {
    id: 'system',
    labelKey: 'settings.nav.system',
    icon: <KeyRound size={15} />,
    descriptionKey: 'settings.nav.systemDescription'
  }
];

/**
 * Что это: статический список групп sidebar.
 * Зачем нужно: sidebar рендерит отдельные панели, а header по-прежнему может искать активный пункт в плоском NAV_ITEMS.
 */
export const NAV_GROUPS: SettingsNavGroup[] = [
  { titleKey: 'settings.sidebarTitle', items: GENERAL_NAV_ITEMS },
  { titleKey: 'settings.behaviorSidebarTitle', items: BEHAVIOR_NAV_ITEMS }
];

/**
 * Что это: плоский список разделов страницы настроек.
 * Зачем нужно: порядок и иконки навигации не зависят от render-state, поэтому держим их вне компонента и переиспользуем в sidebar/header.
 */
export const NAV_ITEMS: SettingsNavItem[] = [...GENERAL_NAV_ITEMS, ...BEHAVIOR_NAV_ITEMS];
