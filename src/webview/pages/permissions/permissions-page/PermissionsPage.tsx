import { useMemo, useState } from 'react';

import { useAgentState } from '../../../shared/lib/agentState';
import styles from '../PermissionsPage.module.scss';
import { CompactionSettingsPage } from './compaction-settings-page';
import { MemorySettingsPage } from './memory-settings-page';
import { NotificationSettingsPage } from './notification-settings-page';
import { OverviewPage } from './overview-page';
import { PermissionsSettingsPage } from './permissions-settings-page';
import { InstructionsSettingsPage, PresetsSettingsPage, RolesSettingsPage } from './prompt-manager';
import { SettingsHeader, SettingsSidebar } from './settings-navigation';
import { SkillsSettingsPage } from './skills-settings-page';
import { SystemSettingsPage } from './system-settings-page';
import { TelemetrySettingsPage } from './telemetry-settings-page';
import type { PermissionsPageProps, SettingsPageId } from './types';

/**
 * Что это: страница настроек агента с sidebar-навигацией.
 * Зачем нужно: компонент оставляет на верхнем уровне только выбор раздела и прокидывание данных, а тяжелые разделы живут отдельно и могут оптимизироваться независимо.
 */
export function PermissionsPage({ onBack, variant = 'page', initialPage = 'overview' }: PermissionsPageProps) {
  const state = useAgentState();
  const [activePage, setActivePage] = useState<SettingsPageId>(initialPage);
  const {
    toolPermissions,
    maxToolIterations,
    auxiliaryModels,
    compactionSettings,
    approvalNotificationSettings,
    composerUiSettings,
    agentLanguage,
    agentMode,
    agentModes,
    agentConfigScope,
    promptConfig,
    memoryItems,
    activeChat,
    models,
    instructionSources,
    customSkills,
    codexAuthenticated,
    toolPermissionPresets,
    activeToolPermissionPresetId,
    projectToolDiagnostics,
    telemetry
  } = state;
  const activeMode = useMemo(
    () => agentModes.find((mode) => mode.id === agentMode) || agentModes[0],
    [agentMode, agentModes]
  );
  const content = (
    <main className={variant === 'embedded' ? styles.mainEmbedded : styles.main}>
      <div className={`${styles.shell} ${variant === 'embedded' ? styles.embeddedShell : ''}`}>
        <SettingsSidebar activePage={activePage} onChange={setActivePage} />
        <div className={styles.content}>
          <SettingsHeader
            activePage={activePage}
            onBack={variant === 'page' ? onBack : undefined}
            compact={variant === 'embedded'}
          />
          {activePage === 'overview' ? (
            <OverviewPage
              state={state}
              agentConfigScope={agentConfigScope}
              activePermissionPresetId={activeToolPermissionPresetId}
              activeMode={activeMode}
              customSkills={customSkills}
              instructionSources={instructionSources}
              codexAuthenticated={codexAuthenticated}
            />
          ) : null}
          {activePage === 'instructions' ? <InstructionsSettingsPage promptConfig={promptConfig} /> : null}
          {activePage === 'modes' ? <RolesSettingsPage promptConfig={promptConfig} /> : null}
          {activePage === 'presets' ? <PresetsSettingsPage promptConfig={promptConfig} /> : null}
          {activePage === 'memory' ? (
            <MemorySettingsPage
              chatId={activeChat.id}
              memoryItems={memoryItems}
              reflectionCandidates={activeChat.reflectionCandidates || []}
            />
          ) : null}
          {activePage === 'skills' ? <SkillsSettingsPage customSkills={customSkills} /> : null}
          {activePage === 'permissions' ? (
            <PermissionsSettingsPage
              tools={toolPermissions}
              projectToolDiagnostics={projectToolDiagnostics}
              permissionPresets={toolPermissionPresets}
              activePermissionPresetId={activeToolPermissionPresetId}
            />
          ) : null}
          {activePage === 'notifications' ? <NotificationSettingsPage settings={approvalNotificationSettings} /> : null}
          {activePage === 'telemetry' ? <TelemetrySettingsPage telemetry={telemetry} /> : null}
          {activePage === 'compaction' ? (
            <CompactionSettingsPage settings={compactionSettings} auxiliaryModels={auxiliaryModels} models={models} />
          ) : null}
          {activePage === 'system' ? (
            <SystemSettingsPage
              agentLanguage={agentLanguage}
              maxToolIterations={maxToolIterations}
              codexAuthenticated={codexAuthenticated}
              composerUiSettings={composerUiSettings}
            />
          ) : null}
        </div>
      </div>
    </main>
  );

  if (variant === 'embedded') {
    return content;
  }

  return <div className={styles.pageRoot}>{content}</div>;
}
