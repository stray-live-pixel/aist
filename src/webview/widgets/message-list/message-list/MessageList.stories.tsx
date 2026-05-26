import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMessages, storyTools } from '../../../storybook/fixtures';
import { MessageList } from './MessageList';

const meta = {
  title: 'Widgets/MessageList/MessageList',
  component: MessageList,
  parameters: {
    layout: 'fullscreen'
  }
} satisfies Meta<typeof MessageList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    messages: [],
    tools: storyTools,
    busy: false,
    activity: undefined
  },
  render: (args) => (
    <div style={{ height: '100vh' }}>
      <MessageList {...args} />
    </div>
  )
};

export const WithMessages: Story = {
  args: {
    messages: storyMessages,
    tools: storyTools,
    busy: false,
    activity: undefined
  },
  render: (args) => (
    <div style={{ height: '100vh' }}>
      <MessageList {...args} />
    </div>
  )
};

export const AgentThinking: Story = {
  args: {
    messages: storyMessages,
    tools: storyTools,
    busy: true,
    activity: 'thinking'
  },
  render: (args) => (
    <div style={{ height: '100vh' }}>
      <MessageList {...args} />
    </div>
  )
};
