import type { Meta, StoryObj } from '@storybook/react-vite';
import { Check, Plus, Trash2 } from 'lucide-react';

import { Button } from './Component';

const meta = {
  title: 'Shared/Design System/Button',
  component: Button,
  parameters: { layout: 'centered' },
  args: {
    children: 'Button'
  }
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <Button variant="primary" leadingIcon={<Plus size={15} />}>
        Create
      </Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger" leadingIcon={<Trash2 size={15} />}>
        Delete
      </Button>
    </div>
  )
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  )
};

export const States: Story = {
  render: () => (
    <div style={{ display: 'grid', width: 320, gap: 12 }}>
      <Button variant="primary" trailingIcon={<Check size={15} />}>
        Ready
      </Button>
      <Button disabled>Disabled</Button>
      <Button fullWidth variant="secondary">
        Full width
      </Button>
    </div>
  )
};
