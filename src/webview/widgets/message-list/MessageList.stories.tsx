import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyAgentModes, storyMessages, storyPromptConfig, storyTools } from '../../storybook/fixtures';
import { EmptyState } from './EmptyState';
import { MessageList } from './MessageList';
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
      <MessageList
        messages={[]}
        tools={storyTools}
        activeMode={storyAgentModes[0]}
        instructionSources={storyInstructionSources}
        promptConfig={storyPromptConfig}
        busy={false}
        activity={undefined}
      />
    </div>
  )
};

export const WithMessages: Story = {
  render: () => (
    <div className="h-screen">
      <MessageList
        messages={storyMessages}
        tools={storyTools}
        activeMode={storyAgentModes[2]}
        instructionSources={storyInstructionSources}
        promptConfig={storyPromptConfig}
        busy={false}
        activity={undefined}
      />
    </div>
  )
};

export const AgentThinking: Story = {
  render: () => (
    <div className="h-screen">
      <MessageList
        messages={storyMessages}
        tools={storyTools}
        activeMode={storyAgentModes[2]}
        instructionSources={storyInstructionSources}
        promptConfig={storyPromptConfig}
        busy
        activity="thinking"
      />
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
  render: () => (
    <SystemInstructionLabel
      mode={storyAgentModes[2]}
      sources={storyInstructionSources}
      promptConfig={storyPromptConfig}
    />
  )
};
