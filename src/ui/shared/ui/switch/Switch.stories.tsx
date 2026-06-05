import type { Meta, StoryObj } from '@storybook/react-vite';

import { Switch } from './Switch';

const meta = {
  title: 'Shared/Design System/Switch',
  component: Switch,
  parameters: { layout: 'centered' },
  args: {
    label: 'Switch'
  }
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  render: () => (
    <div style={{ display: 'grid', width: 380, gap: 16 }}>
      <Switch label="Reasoning mode" description="Use a deeper reasoning effort for complex tasks." />
      <Switch
        defaultChecked
        label="Auto approve read tools"
        description="Safe read-only tools run without confirmation."
      />
      <Switch disabled label="Managed setting" description="Workspace policy disabled this control." />
    </div>
  )
};
