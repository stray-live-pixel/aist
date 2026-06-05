import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyModels } from '../../storybook/fixtures';
import { ModelSelect } from './ModelSelect';

const meta = {
  title: 'Features/Select Model/ModelSelect',
  component: ModelSelect,
  parameters: {
    layout: 'centered'
  },
  args: {
    model: 'codex:gpt-5.1-codex',
    models: storyModels
  }
} satisfies Meta<typeof ModelSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CodexSelected: Story = {};

export const OpenRouterSelected: Story = {
  args: {
    model: 'openai/gpt-4o-mini'
  }
};

export const Disabled: Story = {
  args: {
    disabled: true
  }
};
