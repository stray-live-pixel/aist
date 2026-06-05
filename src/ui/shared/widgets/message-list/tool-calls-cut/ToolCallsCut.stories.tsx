import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMessages } from '../../../storybook/fixtures';
import { ToolCallsCut } from './ToolCallsCut';

const toolMessages = storyMessages.filter((message) => message.role === 'tool');
const userMessage = storyMessages.find((message) => message.role === 'user');
const assistantMessage = [...storyMessages].reverse().find((message) => message.role === 'assistant');

const meta = {
  title: 'Widgets/MessageList/ToolCallsCut',
  component: ToolCallsCut,
  parameters: {
    layout: 'padded'
  }
} satisfies Meta<typeof ToolCallsCut>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CollapsibleGroup: Story = {
  args: {
    tools: toolMessages,
    userMessage,
    assistantMessage,
    active: false
  }
};

export const ActiveGroup: Story = {
  args: {
    tools: toolMessages,
    userMessage,
    active: true
  }
};
