import type { Meta, StoryObj } from '@storybook/react-vite';
import { Settings } from 'lucide-react';

import { Button } from '../button/Component';
import { Switch } from '../switch';
import { Card } from './Card';

const meta = {
  title: 'Shared/Design System/Card',
  component: Card,
  parameters: { layout: 'centered' }
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Tones: Story = {
  render: () => (
    <div style={{ display: 'grid', width: 440, gap: 14 }}>
      <Card title="Default card" description="Neutral surface for regular content.">
        Card content
      </Card>
      <Card tone="elevated" title="Elevated card" description="Use for modal-like panels and important sections." />
      <Card tone="accent" title="Accent card" description="Use sparingly for highlighted blocks." />
    </div>
  )
};

export const SettingsCard: Story = {
  render: () => (
    <Card
      tone="elevated"
      title="Agent settings"
      description="Tune the assistant behavior for this workspace."
      actions={
        <Button size="sm" leadingIcon={<Settings size={14} />}>
          Open
        </Button>
      }
    >
      <Switch defaultChecked label="Auto mode" description="Let the agent choose the best tool strategy." />
    </Card>
  )
};
