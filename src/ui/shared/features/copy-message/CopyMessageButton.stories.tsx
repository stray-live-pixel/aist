import type { Meta, StoryObj } from '@storybook/react-vite';

import { CopyMessageButton } from './CopyMessageButton';

const meta = {
  title: 'Features/Copy Message/CopyMessageButton',
  component: CopyMessageButton,
  parameters: {
    layout: 'centered'
  },
  args: {
    markdown: 'Copied from Storybook'
  }
} satisfies Meta<typeof CopyMessageButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Enabled: Story = {};

export const Disabled: Story = {
  args: {
    markdown: ''
  }
};
