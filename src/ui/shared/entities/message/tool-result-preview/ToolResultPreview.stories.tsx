import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyToolMessages } from '../../../storybook/fixtures';
import { ToolResultPreview } from './ToolResultPreview';

const meta = {
  title: 'Entities/Message/ToolResultPreview',
  component: ToolResultPreview,
  parameters: {
    layout: 'padded'
  }
} satisfies Meta<typeof ToolResultPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Preview для tool-call, ожидающего подтверждения. */
export const WaitingApproval: Story = {
  args: { message: storyToolMessages.waitingApproval }
};

/** Preview для запущенного bash-скрипта. */
export const RunningBash: Story = {
  args: { message: storyToolMessages.runningBash }
};

/** Preview для завершённого bash-скрипта с выводом. */
export const FinishedBash: Story = {
  args: { message: storyToolMessages.finishedBash }
};

/** Preview для tool-call с ошибкой. */
export const Errored: Story = {
  args: { message: storyToolMessages.errored }
};

/** Preview для list_files. */
export const ListFiles: Story = {
  args: { message: storyToolMessages.listFiles }
};
