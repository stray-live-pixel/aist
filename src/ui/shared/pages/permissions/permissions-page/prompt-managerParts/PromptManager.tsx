import { type AgentPromptConfig } from '../../../../types';
import { InstructionsSettingsPage } from './InstructionsSettingsPage';
import { RolesSettingsPage } from './RolesSettingsPage';

export function PromptManager({
  promptConfig,
  focus = 'instructions'
}: {
  promptConfig: AgentPromptConfig;
  defaultTab?: 'global' | 'local' | 'priorities';
  focus?: 'instructions' | 'modes';
}) {
  return focus === 'modes' ? (
    <RolesSettingsPage promptConfig={promptConfig} />
  ) : (
    <InstructionsSettingsPage promptConfig={promptConfig} />
  );
}
