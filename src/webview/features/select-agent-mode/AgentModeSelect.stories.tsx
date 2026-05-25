import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyAgentModes } from '../../storybook/fixtures';
import { AgentModeSelect } from './AgentModeSelect';

const meta = {
  title: 'Features/Select Agent Mode/AgentModeSelect',
  component: AgentModeSelect,
  parameters: {
    layout: 'centered'
  },
  args: {
    modes: storyAgentModes,
    activeId: 'frontend',
    className: 'storyAgentModeWidth'
  }
} satisfies Meta<typeof AgentModeSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const BuiltInMode: Story = {
  args: {
    activeId: 'default'
  }
};
