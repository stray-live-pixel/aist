import type { Meta, StoryObj } from '@storybook/react-vite';

import type { ChatModelRequestPhase, ChatModelRequestStatus } from '../../types';
import { ModelRequestStatus } from './ModelRequestStatus';

const meta = {
  title: 'Shared/Design System/ModelRequestStatus',
  component: ModelRequestStatus,
  parameters: { layout: 'centered' }
} satisfies Meta<typeof ModelRequestStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseRequest: ChatModelRequestStatus = {
  provider: 'openrouter',
  model: 'openai/gpt-4o-mini',
  attempt: 1,
  maxAttempts: 3,
  requestNumber: 4,
  phase: 'sending',
  stream: false,
  startedAt: Date.now() - 12_400,
  updatedAt: Date.now()
};

const phases: ChatModelRequestPhase[] = [
  'sending',
  'receiving',
  'streaming',
  'completed',
  'retrying',
  'failed',
  'aborted'
];

export const AllPhases: Story = {
  args: {
    elapsedMs: 12_400,
    request: baseRequest
  },
  render: () => (
    <div style={{ display: 'grid', gap: 10, width: 460 }}>
      {phases.map((phase, index) => (
        <ModelRequestStatus
          key={phase}
          elapsedMs={index * 1234 + 567}
          request={{
            ...baseRequest,
            phase,
            attempt: phase === 'retrying' || phase === 'failed' ? 2 : 1,
            provider: index % 2 === 0 ? 'openrouter' : 'codex',
            model: index % 2 === 0 ? 'openai/gpt-4o-mini' : 'codex:gpt-5.1-codex'
          }}
        />
      ))}
    </div>
  )
};

export const LongModelId: Story = {
  args: {
    elapsedMs: 98_700,
    request: {
      ...baseRequest,
      phase: 'streaming',
      model: 'anthropic/claude-sonnet-4.5-very-long-experimental-model-id'
    }
  }
};
