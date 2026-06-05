import { type AgentPromptConfig } from '../../../../shared/types';
import { RolesSettingsPage } from './RolesSettingsPage';

export function ModesSettingsPage({ promptConfig }: { promptConfig: AgentPromptConfig }) {
  return <RolesSettingsPage promptConfig={promptConfig} />;
}
