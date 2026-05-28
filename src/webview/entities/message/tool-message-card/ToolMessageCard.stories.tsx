import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyToolMessages } from '../../../storybook/fixtures';
import { ToolMessageCard } from './ToolMessageCard';

const meta = {
  title: 'Entities/Message/ToolMessageCard',
  component: ToolMessageCard,
  parameters: {
    layout: 'padded'
  }
} satisfies Meta<typeof ToolMessageCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Карточка tool-call, ожидающего подтверждения. */
export const WaitingApproval: Story = {
  args: { message: storyToolMessages.waitingApproval }
};

/** Карточка запущенного bash-скрипта. */
export const RunningBash: Story = {
  args: { message: storyToolMessages.runningBash }
};

/** Карточка завершённого bash-скрипта. */
export const FinishedBash: Story = {
  args: { message: storyToolMessages.finishedBash }
};

/** Карточка tool-call с комментарием approval. */
export const ApprovedWithComment: Story = {
  args: { message: storyToolMessages.approvedWithComment }
};

/** Карточка tool-call с ошибкой. */
export const Errored: Story = {
  args: { message: storyToolMessages.errored }
};

/** Карточка list_files. */
export const ListFiles: Story = {
  args: { message: storyToolMessages.listFiles }
};
