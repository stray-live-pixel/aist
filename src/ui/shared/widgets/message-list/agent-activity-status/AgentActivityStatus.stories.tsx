import type { Meta, StoryObj } from '@storybook/react-vite';

import { AgentActivityStatus } from './AgentActivityStatus';

const meta = {
  title: 'Widgets/MessageList/AgentActivityStatus',
  component: AgentActivityStatus,
  parameters: {
    layout: 'padded'
  }
} satisfies Meta<typeof AgentActivityStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Thinking: Story = {
  args: {
    activity: 'thinking'
  }
};

export const WithMarkdownDetail: Story = {
  args: {
    activity: 'runningTool',
    detail: 'Выполняю `npm run typecheck` и жду результат.'
  }
};
