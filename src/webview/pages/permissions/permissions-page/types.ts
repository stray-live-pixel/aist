import type { ReactNode } from 'react';

import type { useI18n } from '../../../shared/i18n';
import type {
  AgentConfigScope,
  AgentInstructionSource,
  AgentLanguage,
  AgentMode,
  AgentModeId,
  AgentPromptConfig,
  AgentSkill,
  ApprovalNotificationSettings,
  CompactionSettings,
  ToolPermissionItem,
  ToolPermissionPreset,
  ToolPermissionPresetId
} from '../../../shared/types';

/**
 * Что это: идентификатор раздела настроек в левой навигации.
 * Зачем нужно: один union синхронизирует sidebar, заголовок страницы и switch основного контента.
 */
export type SettingsPageId =
  | 'overview'
  | 'instructions'
  | 'modes'
  | 'skills'
  | 'permissions'
  | 'notifications'
  | 'compaction'
  | 'system';

/**
 * Что это: props верхнего контейнера страницы настроек.
 * Зачем нужно: страница используется и как отдельный page, и как embedded modal-содержимое в чате.
 */
export type PermissionsPageProps = {
  tools: ToolPermissionItem[];
  maxToolIterations: number;
  compactionSettings: CompactionSettings;
  approvalNotificationSettings: ApprovalNotificationSettings;
  agentLanguage: AgentLanguage;
  agentMode: AgentModeId;
  agentModes: AgentMode[];
  agentConfigScope: AgentConfigScope;
  projectInstructions: string;
  promptConfig: AgentPromptConfig;
  instructionSources: AgentInstructionSource[];
  customSkills: AgentSkill[];
  codexAuthenticated: boolean;
  permissionPresets: ToolPermissionPreset[];
  activePermissionPresetId: ToolPermissionPresetId | 'custom';
  onBack?(): void;
  variant?: 'page' | 'embedded';
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
