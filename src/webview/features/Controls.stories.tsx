import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyAgentModes, storyAgentState, storyModels, storyToolPermissions } from '../storybook/fixtures';
import { ToolPermissionSelect } from './configure-tool-permission/ToolPermissionSelect';
import { CopyMessageButton } from './copy-message/CopyMessageButton';
import { AgentModeSelect } from './select-agent-mode/AgentModeSelect';
import { ModelSelect } from './select-model/ModelSelect';
import { Composer } from './send-message/Composer';

const meta = {
  title: 'Features/Controls',
  parameters: {
    layout: 'padded'
  }
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const ModelPicker: Story = {
  render: () => <ModelSelect model="codex:gpt-5.1-codex" models={storyModels} />
};

export const AgentModePicker: Story = {
  render: () => <AgentModeSelect modes={storyAgentModes} activeId="frontend" className="w-56" />
};

export const ComposerReady: Story = {
  render: () => (
    <div className="max-w-4xl overflow-hidden rounded-md border border-[var(--agent-border)]">
      <Composer
        busy={false}
        settings={
          <span className="text-[11px] text-[var(--vscode-descriptionForeground)]">
            Mode: Frontend · Safe access · Tokens: 12.4K · Cost: ~$0.0021
          </span>
        }
      />
    </div>
  )
};

export const ComposerBusy: Story = {
  render: () => (
    <div className="max-w-4xl overflow-hidden rounded-md border border-[var(--agent-border)]">
      <Composer
        busy
        settings={
          <span className="text-[11px] text-[var(--vscode-descriptionForeground)]">
            Mode: Expert · Auto access · Tokens: 118K · Cost: ~$0.0310
          </span>
        }
      />
    </div>
  )
};

export const ToolPermissionRows: Story = {
  render: () => (
    <div className="grid max-w-4xl gap-3">
      {storyToolPermissions.map((item) => (
        <ToolPermissionSelect key={item.name} item={item} />
      ))}
    </div>
  )
};

export const CopyMessage: Story = {
  parameters: {
    layout: 'centered'
  },
  render: () => <CopyMessageButton markdown="Copied from Storybook" />
};
