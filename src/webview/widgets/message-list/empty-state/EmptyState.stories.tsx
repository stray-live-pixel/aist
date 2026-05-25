import type { Meta, StoryObj } from '@storybook/react-vite';

import { EmptyState } from './EmptyState';

const meta = {
  title: 'Widgets/MessageList/EmptyState',
  component: EmptyState,
  parameters: {
    layout: 'padded'
  }
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
