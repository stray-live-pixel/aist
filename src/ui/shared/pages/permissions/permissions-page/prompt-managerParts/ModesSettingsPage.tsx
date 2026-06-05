import { type AgentPromptConfig } from '../../../../types';
import { RolesSettingsPage } from './RolesSettingsPage';

export function ModesSettingsPage({ promptConfig }: { promptConfig: AgentPromptConfig }) {
  return <RolesSettingsPage promptConfig={promptConfig} />;
}
