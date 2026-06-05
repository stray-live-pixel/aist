import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyToolPermissions } from '../../storybook/fixtures';
import { ToolPermissionSelect } from './ToolPermissionSelect';

const meta = {
  title: 'Features/Configure Tool Permission/ToolPermissionSelect',
  component: ToolPermissionSelect,
  parameters: {
    layout: 'padded'
  },
  args: {
    item: storyToolPermissions[0]
  }
} satisfies Meta<typeof ToolPermissionSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AutoRead: Story = {};

export const AskBash: Story = {
  args: {
    item: storyToolPermissions[2]
  }
};
