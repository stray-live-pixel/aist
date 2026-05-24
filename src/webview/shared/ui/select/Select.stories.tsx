import type { Meta, StoryObj } from '@storybook/react-vite';
import { Brain } from 'lucide-react';

import { Select } from './Select';

const options = [
  { value: 'gpt-4o-mini', label: 'GPT-4o mini' },
  { value: 'gpt-4.1', label: 'GPT-4.1' },
  { value: 'codex', label: 'ChatGPT Codex' },
  { value: 'disabled', label: 'Disabled option', disabled: true }
];

const meta = {
  title: 'Shared/Design System/Select',
  component: Select,
  parameters: { layout: 'centered' },
  args: {
    options
  }
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () => (
    <Select label="Model" options={options} defaultValue="gpt-4o-mini" hint="Choose a model for the next answer." />
  )
};

export const Placeholder: Story = {
  render: () => <Select label="Mode" placeholder="Select mode" options={options} />
};

export const WithError: Story = {
  render: () => (
    <Select label="Provider" placeholder="Select provider" options={options} error="Provider is required." />
  )
};

export const CompactSearchable: Story = {
  render: () => (
    <div className="w-40">
      <Select size="sm" leadingIcon={<Brain size={12} />} options={options} defaultValue="gpt-4o-mini" />
    </div>
  )
};
