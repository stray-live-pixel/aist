import type { Meta, StoryObj } from '@storybook/react-vite';

import { ToolApprovalActions } from './ToolApprovalActions';

const meta = {
  title: 'Entities/Message/ToolApprovalActions',
  component: ToolApprovalActions,
  parameters: {
    layout: 'padded'
  }
} satisfies Meta<typeof ToolApprovalActions>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Полноэкранный режим для модалки. */
export const Default: Story = {
  args: {
    messageId: 'tool-approval-story',
    compact: false,
    autoFocusApprove: false
  }
};

/** Компактный режим для встраивания в карточку. */
export const Compact: Story = {
  args: {
    messageId: 'tool-approval-story',
    compact: true,
    autoFocusApprove: false
  }
};
