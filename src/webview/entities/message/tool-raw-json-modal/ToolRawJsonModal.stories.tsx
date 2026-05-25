import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyToolMessages } from '../../../storybook/fixtures';
import { ToolRawJsonModal } from './ToolRawJsonModal';

const meta = {
  title: 'Entities/Message/ToolRawJsonModal',
  component: ToolRawJsonModal,
  parameters: {
    layout: 'padded'
  }
} satisfies Meta<typeof ToolRawJsonModal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Модалка с JSON для tool-call, ожидающего подтверждения. */
export const WaitingApproval: Story = {
  args: {
    message: storyToolMessages.waitingApproval,
    onClose: () => undefined
  }
};

/** Модалка с JSON для завершённого bash-скрипта. */
export const FinishedBash: Story = {
  args: {
    message: storyToolMessages.finishedBash,
    onClose: () => undefined
  }
};
