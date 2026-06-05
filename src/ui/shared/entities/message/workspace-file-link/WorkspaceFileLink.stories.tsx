import type { Meta, StoryObj } from '@storybook/react-vite';

import { WorkspaceFileLink } from './WorkspaceFileLink';

const meta = {
  title: 'Entities/Message/WorkspaceFileLink',
  component: WorkspaceFileLink,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof WorkspaceFileLink>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Простая ссылка на файл без позиции. */
export const Default: Story = {
  args: {
    file: { path: 'src/webview/entities/message/MessageCard.tsx' }
  }
};

/** Ссылка с номером строки. */
export const WithLine: Story = {
  args: {
    file: { path: 'src/webview/entities/message/MessageCard.tsx', line: 14 }
  }
};

/** Ссылка с меткой изменённых строк. */
export const WithChangedLines: Story = {
  args: {
    file: {
      path: 'src/webview/app/styles.css',
      line: 42,
      endLine: 58,
      label: 'changed lines 42-58'
    }
  }
};
