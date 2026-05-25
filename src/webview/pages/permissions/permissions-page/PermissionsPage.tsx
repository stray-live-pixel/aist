import { useMemo, useState } from 'react';

import styles from '../PermissionsPage.module.scss';
import { CompactionSettingsPage } from './compaction-settings-page';
import { NotificationSettingsPage } from './notification-settings-page';
import { OverviewPage } from './overview-page';
import { PermissionsSettingsPage } from './permissions-settings-page';
import { PromptManager } from './prompt-manager';
import { SettingsHeader, SettingsSidebar } from './settings-navigation';
import { SkillsSettingsPage } from './skills-settings-page';
import { SystemSettingsPage } from './system-settings-page';
import type { PermissionsPageProps, SettingsPageId } from './types';

/**
 * Что это: страница настроек агента с sidebar-навигацией.
 * Зачем нужно: компонент оставляет на верхнем уровне только выбор раздела и прокидывание данных, а тяжелые разделы живут отдельно и могут оптимизироваться независимо.
 */
export function PermissionsPage({
  tools,
  maxToolIterations,
  compactionSettings,
  approvalNotificationSettings,
  agentLanguage,
  agentMode,
  agentModes,
  agentConfigScope,
  projectInstructions: _projectInstructions,
  promptConfig,
  instructionSources,
  customSkills,
  codexAuthenticated,
  permissionPresets,
  activePermissionPresetId,
  onBack,
  variant = 'page'
}: PermissionsPageProps) {
  const [activePage, setActivePage] = useState<SettingsPageId>('overview');
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
              agentConfigScope={agentConfigScope}
              activePermissionPresetId={activePermissionPresetId}
              activeMode={activeMode}
              customSkills={customSkills}
              instructionSources={instructionSources}
              codexAuthenticated={codexAuthenticated}
            />
          ) : null}
          {activePage === 'instructions' ? <PromptManager promptConfig={promptConfig} defaultTab="priorities" /> : null}
          {activePage === 'modes' ? (
            <PromptManager promptConfig={promptConfig} defaultTab="priorities" focus="modes" />
          ) : null}
          {activePage === 'skills' ? <SkillsSettingsPage customSkills={customSkills} /> : null}
          {activePage === 'permissions' ? (
            <PermissionsSettingsPage
              tools={tools}
              permissionPresets={permissionPresets}
              activePermissionPresetId={activePermissionPresetId}
            />
          ) : null}
          {activePage === 'notifications' ? <NotificationSettingsPage settings={approvalNotificationSettings} /> : null}
          {activePage === 'compaction' ? <CompactionSettingsPage settings={compactionSettings} /> : null}
          {activePage === 'system' ? (
            <SystemSettingsPage
              agentLanguage={agentLanguage}
              maxToolIterations={maxToolIterations}
              codexAuthenticated={codexAuthenticated}
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
