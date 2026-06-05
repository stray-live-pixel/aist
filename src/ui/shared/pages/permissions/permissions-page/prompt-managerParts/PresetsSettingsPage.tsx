import { useState } from 'react';

import { type AgentPromptConfig } from '../../../../types';
import styles from '../../PermissionsPage.module.scss';
import { BehaviorScopeTabs, type BehaviorTab } from '../behavior-scope-tabs';
import { ActivePresetCard } from './ActivePresetCard';
import { PromptManagerIntro } from './PromptManagerIntro';
import { PromptPriorityManager } from './PromptPriorityManager';

export function PresetsSettingsPage({ promptConfig }: { promptConfig: AgentPromptConfig }) {
  const [tab, setTab] = useState<BehaviorTab>('active');

  return (
    <div className={styles.sectionStack}>
      <PromptManagerIntro
        titleKey="settings.promptManager.presetsPageTitle"
        descriptionKey="settings.promptManager.presetsPageDescription"
      />
      <BehaviorScopeTabs activeTab={tab} includeActive subject="presets" onChange={setTab} />
      {tab === 'active' ? <ActivePresetCard promptConfig={promptConfig} /> : null}
      {tab !== 'active' ? <PromptPriorityManager promptConfig={promptConfig} scope={tab} /> : null}
    </div>
  );
}
