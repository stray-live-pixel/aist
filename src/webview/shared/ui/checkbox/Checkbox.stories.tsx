import type { Meta, StoryObj } from '@storybook/react-vite';

import { Checkbox } from './Checkbox';

const meta = {
  title: 'Shared/Design System/Checkbox',
  component: Checkbox,
  parameters: { layout: 'centered' },
  args: {
    label: 'Checkbox'
  }
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  render: () => (
    <div style={{ display: 'grid', width: 360, gap: 14 }}>
      <Checkbox label="Enable tool calls" description="Allow the agent to inspect workspace files." />
      <Checkbox
        defaultChecked
        label="Auto approve safe reads"
        description="Read-only tools can run without confirmation."
      />
      <Checkbox disabled label="Disabled setting" description="This option is controlled by workspace policy." />
    </div>
  )
};
