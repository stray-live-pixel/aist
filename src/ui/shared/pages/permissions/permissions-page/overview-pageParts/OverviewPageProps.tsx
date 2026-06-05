import type {
  AgentConfigScope,
  AgentInstructionSource,
  AgentMode,
  AgentSkill,
  AgentState,
  ToolPermissionPresetId
} from '../../../../types';
import type { SettingsPageId } from '../types';

/**
 * Что это: входные данные страницы «Обзор» настроек агента.
 * Зачем нужно: обзор показывает срез уже собранного AgentState и не меняет настройки напрямую.
 * Какую продуктовую проблему решает: пользователь видит понятную сводку текущего поведения агента перед следующим запросом.
 */
export type OverviewPageProps = {
  state: AgentState;
  agentConfigScope: AgentConfigScope;
  activePermissionPresetId: ToolPermissionPresetId | 'custom';
  activeMode: AgentMode | undefined;
  customSkills: AgentSkill[];
  instructionSources: AgentInstructionSource[];
  codexAuthenticated: boolean;
  /** Переход к профильному разделу настроек, где пользователь может изменить показанную в обзоре область. */
  onNavigate(page: SettingsPageId): void;
};
