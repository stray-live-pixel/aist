import type { Meta, StoryObj } from '@storybook/react-vite';
import { Check, Clock, TriangleAlert } from 'lucide-react';

import { Badge } from './Badge';

const meta = {
  title: 'Shared/Design System/Badge',
  component: Badge,
  parameters: { layout: 'centered' }
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Tones: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <Badge>Neutral</Badge>
      <Badge tone="accent">Accent</Badge>
      <Badge tone="success" icon={<Check size={12} />}>
        Done
      </Badge>
      <Badge tone="warning" icon={<Clock size={12} />}>
        Waiting
      </Badge>
      <Badge tone="danger" icon={<TriangleAlert size={12} />}>
        Error
      </Badge>
    </div>
  )
};
