import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyToolPermissionPresets } from '../../storybook/fixtures';
import { PermissionPresetSelect } from './PermissionPresetSelect';

const meta = {
  title: 'Features/Select Permission Preset/PermissionPresetSelect',
  component: PermissionPresetSelect,
  parameters: {
    layout: 'centered'
  },
  args: {
    presets: storyToolPermissionPresets,
    activeId: 'balanced'
  }
} satisfies Meta<typeof PermissionPresetSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Balanced: Story = {};

export const Custom: Story = {
  args: {
    activeId: 'custom'
  }
};

export const Disabled: Story = {
  args: {
    disabled: true
  }
};
