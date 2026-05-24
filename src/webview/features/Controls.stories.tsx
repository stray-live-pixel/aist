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
        model={storyAgentState.activeChat.model}
        models={storyModels}
        reasoningEffort="medium"
        permissionPresets={storyAgentState.toolPermissionPresets}
        activePermissionPresetId={storyAgentState.activeToolPermissionPresetId}
        toolsCount={storyAgentState.tools.length}
        context={storyAgentState.activeChat.context}
        usage={storyAgentState.activeChat.usage}
      />
    </div>
  )
};

export const ComposerBusy: Story = {
  render: () => (
    <div className="max-w-4xl overflow-hidden rounded-md border border-[var(--agent-border)]">
      <Composer
        busy
        model="anthropic/claude-3.7-sonnet"
        models={storyModels}
        activity="runningTool"
        reasoningEffort="high"
        permissionPresets={storyAgentState.toolPermissionPresets}
        activePermissionPresetId={storyAgentState.activeToolPermissionPresetId}
        toolsCount={storyAgentState.tools.length}
        context={{ tokens: 118000, maxTokens: 128000, percent: 92, inputCostUsd: 0.031 }}
        usage={storyAgentState.activeChat.usage}
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
