import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyAgentModes, storyPromptConfig } from '../../../storybook/fixtures';
import { SystemInstructionLabel } from './SystemInstructionLabel';

const storyInstructionSources = [
  {
    id: 'base',
    title: 'AIST base system prompt',
    content: 'Core coding-agent rules and tool usage policy.',
    priority: 0,
    kind: 'base' as const
  },
  {
    id: 'AGENTS.md',
    title: 'AGENTS.md',
    content: 'Follow project architecture and testing rules.',
    priority: 20,
    kind: 'file' as const
  }
];

const meta = {
  title: 'Widgets/MessageList/SystemInstructionLabel',
  component: SystemInstructionLabel,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof SystemInstructionLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    mode: storyAgentModes[2],
    sources: storyInstructionSources,
    promptConfig: storyPromptConfig
  }
};
