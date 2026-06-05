import type { Meta, StoryObj } from '@storybook/react-vite';

import { AgentStateProvider } from '../shared/lib/agentState';
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
  render: () => (
    <AgentStateProvider state={storyAgentState}>
      <ChatPage onOpenSettingsPage={() => undefined} />
    </AgentStateProvider>
  )
};

export const ChatBusy: Story = {
  render: () => (
    <AgentStateProvider
      state={{
        ...storyAgentState,
        activeChat: {
          ...storyAgentState.activeChat,
          busy: true,
          activity: 'waitingForApproval'
        }
      }}
    >
      <ChatPage onOpenSettingsPage={() => undefined} />
    </AgentStateProvider>
  )
};

export const Settings: Story = {
  render: () => (
    <AgentStateProvider state={storyAgentState}>
      <PermissionsPage onBack={() => undefined} />
    </AgentStateProvider>
  )
};
