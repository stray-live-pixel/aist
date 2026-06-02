import { memo } from 'react';

import { type AgentLanguage, type ChatSummary } from '../../../shared/types';
import styles from '../ChatPage.module.scss';
import { getChatStatus } from './getChatStatus';

export const ChatStatusLabel = memo(function ChatStatusLabel({
  chat,
  language
}: {
  chat: ChatSummary;
  language: AgentLanguage;
}) {
  if (!chat.busy) {
    return null;
  }

  const status = getChatStatus(chat, language);
  return (
    <span
      className={`${styles.chatStatusLabel} ${styles[status.className]}`}
      title={chat.activityDetail || status.label}
    >
      <span className={styles.chatStatusDot} />
      {status.label}
    </span>
  );
});
