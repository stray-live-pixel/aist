import { useState } from 'react';

import { type AgentPromptConfig } from '../../../../shared/types';
import styles from '../../PermissionsPage.module.scss';
import { BehaviorScopeTabs, type BehaviorTab } from '../behavior-scope-tabs';
import { ActivePromptSet } from './ActivePromptSet';
import { PromptLibrary } from './PromptLibrary';
import { PromptManagerIntro } from './PromptManagerIntro';

export function InstructionsSettingsPage({ promptConfig }: { promptConfig: AgentPromptConfig }) {
  const [tab, setTab] = useState<BehaviorTab>('active');

  return (
    <div className={styles.sectionStack}>
      <PromptManagerIntro
        titleKey="settings.promptManager.instructionsTitle"
        descriptionKey="settings.promptManager.instructionsDescription"
      />
      <BehaviorScopeTabs activeTab={tab} includeActive subject="instructions" onChange={setTab} />
      {tab === 'active' ? <ActivePromptSet promptConfig={promptConfig} /> : null}
      {tab !== 'active' ? <PromptLibrary kind="instructions" scope={tab} promptConfig={promptConfig} /> : null}
    </div>
  );
}
