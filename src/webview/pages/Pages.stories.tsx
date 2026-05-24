import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyAgentState } from '../storybook/fixtures';
import { ChatPage } from './chat/ChatPage';
import { PermissionsPage } from './permissions/PermissionsPage';

const meta = {
  title: 'Pages',
  parameters: {
    layout: 'fullscreen'
  }
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Chat: Story = {
  render: () => <ChatPage state={storyAgentState} />
};

export const ChatBusy: Story = {
  render: () => (
    <ChatPage
      state={{
        ...storyAgentState,
        activeChat: {
          ...storyAgentState.activeChat,
          busy: true,
          activity: 'waitingForApproval'
        }
      }}
    />
  )
};

export const Settings: Story = {
  render: () => (
    <PermissionsPage
      tools={storyAgentState.toolPermissions}
      maxToolIterations={storyAgentState.maxToolIterations}
      agentLanguage={storyAgentState.agentLanguage}
      agentMode={storyAgentState.agentMode}
      agentModes={storyAgentState.agentModes}
      customSkills={storyAgentState.customSkills}
      codexAuthenticated={storyAgentState.codexAuthenticated}
      permissionPresets={storyAgentState.toolPermissionPresets}
      activePermissionPresetId={storyAgentState.activeToolPermissionPresetId}
      onBack={() => undefined}
    />
  )
};
