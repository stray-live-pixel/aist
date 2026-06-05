import type { Meta, StoryObj } from '@storybook/react-vite';

import { CopyMessageButton } from '../../../features';
import { storyMessages, storyToolMessages } from '../../../storybook/fixtures';
import { MessageCard } from './MessageCard';

const meta = {
  title: 'Entities/Message/MessageCard',
  parameters: {
    layout: 'padded'
  }
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Все сообщения диалога: user, assistant, tool. */
export const ConversationCards: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: '12px', maxWidth: '896px' }}>
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

/** Различные состояния tool-call карточек. */
export const ToolStates: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: '12px', maxWidth: '896px' }}>
      {Object.values(storyToolMessages).map((message) => (
        <MessageCard key={message.id} message={message} />
      ))}
    </div>
  )
};
