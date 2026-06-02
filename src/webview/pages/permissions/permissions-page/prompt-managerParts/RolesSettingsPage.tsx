import { useState } from 'react';

import { type AgentPromptConfig } from '../../../../shared/types';
import styles from '../../PermissionsPage.module.scss';
import { BehaviorScopeTabs, type BehaviorTab } from '../behavior-scope-tabs';
import { ActiveRoleCard } from './ActiveRoleCard';
import { PromptLibrary } from './PromptLibrary';
import { PromptManagerIntro } from './PromptManagerIntro';

export function RolesSettingsPage({ promptConfig }: { promptConfig: AgentPromptConfig }) {
  const [tab, setTab] = useState<BehaviorTab>('active');

  return (
    <div className={styles.sectionStack}>
      <PromptManagerIntro
        titleKey="settings.promptManager.rolesTitle"
        descriptionKey="settings.promptManager.rolesDescription"
      />
      <BehaviorScopeTabs activeTab={tab} includeActive subject="roles" onChange={setTab} />
      {tab === 'active' ? <ActiveRoleCard promptConfig={promptConfig} /> : null}
      {tab !== 'active' ? <PromptLibrary kind="roles" scope={tab} promptConfig={promptConfig} /> : null}
    </div>
  );
}
