import type { Meta, StoryObj } from '@storybook/react-vite';

import { CopyMessageButton } from '../../features/copy-message/CopyMessageButton';
import { storyMessages, storyToolMessages } from '../../storybook/fixtures';
import { MessageCard } from './MessageCard';
import { ToolRawJsonModal } from './ToolRawJsonModal';
import { ToolResultPreview } from './ToolResultPreview';
import { WorkspaceFileLink } from './WorkspaceFileLink';

const meta = {
  title: 'Entities/Messages',
  parameters: {
    layout: 'padded'
  }
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const ConversationCards: Story = {
  render: () => (
    <div className="grid max-w-4xl gap-3">
      {storyMessages.map((message) => (
        <MessageCard
          key={message.id}
          message={message}
          actions={message.content ? <CopyMessageButton markdown={message.content} /> : null}
        />
      ))}
    </div>
  )
};

export const ToolStates: Story = {
  render: () => (
    <div className="grid max-w-4xl gap-3">
      {Object.values(storyToolMessages).map((message) => (
        <MessageCard key={message.id} message={message} />
      ))}
    </div>
  )
};

export const ToolResultVariants: Story = {
  render: () => (
    <div className="grid max-w-4xl gap-4">
      {Object.values(storyToolMessages).map((message) => (
        <section key={message.id} className="message-card bg-[var(--vscode-input-background)]">
          <h2 className="mb-2 text-sm font-semibold">{message.name}</h2>
          <ToolResultPreview message={message} />
        </section>
      ))}
    </div>
  )
};

export const FileLink: Story = {
  parameters: {
    layout: 'centered'
  },
  render: () => (
    <WorkspaceFileLink file={{ path: 'src/webview/entities/message/MessageCard.tsx', line: 14, label: 'component' }} />
  )
};

export const RawJsonModal: Story = {
  render: () => <ToolRawJsonModal message={storyToolMessages.waitingApproval} onClose={() => undefined} />
};
