import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyAgentModes, storyMessages, storyTools } from '../../storybook/fixtures';
import { EmptyState } from './EmptyState';
import { MessageList } from './MessageList';
import { SystemInstructionLabel } from './SystemInstructionLabel';

const meta = {
  title: 'Widgets/MessageList',
  parameters: {
    layout: 'fullscreen'
  }
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  render: () => (
    <div className="h-screen">
      <MessageList messages={[]} tools={storyTools} activeMode={storyAgentModes[0]} />
    </div>
  )
};

export const WithMessages: Story = {
  render: () => (
    <div className="h-screen">
      <MessageList messages={storyMessages} tools={storyTools} activeMode={storyAgentModes[2]} />
    </div>
  )
};

export const EmptyStateOnly: Story = {
  parameters: {
    layout: 'padded'
  },
  render: () => <EmptyState tools={storyTools} />
};

export const SystemInstruction: Story = {
  parameters: {
    layout: 'centered'
  },
  render: () => <SystemInstructionLabel mode={storyAgentModes[2]} />
};
