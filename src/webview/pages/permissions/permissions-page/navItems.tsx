import { BellRing, Bot, FileText, Gauge, KeyRound, ShieldCheck, SlidersHorizontal, Wrench } from 'lucide-react';

import type { SettingsNavItem } from './types';

/**
 * Что это: статический список разделов страницы настроек.
 * Зачем нужно: порядок и иконки навигации не зависят от render-state, поэтому держим их вне компонента и переиспользуем в sidebar/header.
 */
export const NAV_ITEMS: SettingsNavItem[] = [
  {
    id: 'overview',
    labelKey: 'settings.nav.overview',
    icon: <SlidersHorizontal size={15} />,
    descriptionKey: 'settings.nav.overviewDescription'
  },
  {
    id: 'instructions',
    labelKey: 'settings.nav.instructions',
    icon: <FileText size={15} />,
    descriptionKey: 'settings.nav.instructionsDescription'
  },
  {
    id: 'modes',
    labelKey: 'settings.nav.modes',
    icon: <Bot size={15} />,
    descriptionKey: 'settings.nav.modesDescription'
  },
  {
    id: 'skills',
    labelKey: 'settings.nav.skills',
    icon: <Wrench size={15} />,
    descriptionKey: 'settings.nav.skillsDescription'
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
