import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyAgentModes, storyMessages, storyPromptConfig, storyTools } from '../../../storybook/fixtures';
import { MessageList } from './MessageList';

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
  },
  {
    id: 'mode',
    title: 'Mode: Expert',
    content: storyAgentModes[2].instructions,
    priority: 50,
    kind: 'mode' as const
  }
];

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
    activeMode: storyAgentModes[0],
    instructionSources: storyInstructionSources,
    promptConfig: storyPromptConfig,
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
    activeMode: storyAgentModes[2],
    instructionSources: storyInstructionSources,
    promptConfig: storyPromptConfig,
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
    activeMode: storyAgentModes[2],
    instructionSources: storyInstructionSources,
    promptConfig: storyPromptConfig,
    busy: true,
    activity: 'thinking'
  },
  render: (args) => (
    <div style={{ height: '100vh' }}>
      <MessageList {...args} />
    </div>
  )
};
