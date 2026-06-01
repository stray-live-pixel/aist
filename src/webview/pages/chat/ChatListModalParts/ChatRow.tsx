import { Check, MessageSquare } from 'lucide-react';
import { memo } from 'react';

import styles from '../ChatPage.module.scss';
import { ChatRowProps } from './ChatRowProps';
import { ChatStatusLabel } from './ChatStatusLabel';
import { DeleteActions } from './DeleteActions';
import { RowActions } from './RowActions';
import { formatChatMeta } from './formatChatMeta';

export const ChatRow = memo(function ChatRow(props: ChatRowProps) {
  const { chat, active, confirmingDelete, language } = props;

  return (
    <div className={active ? `${styles.chatRow} ${styles.chatRowActive}` : styles.chatRow}>
      <button className={styles.chatRowButton} onClick={props.onSelect}>
        {active ? <Check size={14} /> : <MessageSquare size={14} className={styles.chatRowIconMuted} />}
        <span className={styles.chatRowContent}>
          <span className={styles.chatRowTitleLine}>
            <span className={styles.chatRowTitle} title={chat.title}>
              {chat.title}
            </span>
            <ChatStatusLabel chat={chat} language={language} />
          </span>
          {chat.lastUserMessage ? (
            <span
              className={
                active ? styles.chatRowMessage : `${styles.chatRowMessage} ${styles.chatRowMuted} ${styles.chatRowDim}`
              }
              title={chat.lastUserMessage}
            >
              {chat.lastUserMessage}
            </span>
          ) : null}
          <span className={active ? styles.chatRowMeta : `${styles.chatRowMeta} ${styles.chatRowMuted}`}>
            {formatChatMeta(chat, language)}
          </span>
        </span>
      </button>
      <div className={styles.chatRowActions}>
        {confirmingDelete ? (
          <DeleteActions onCancel={props.onCancelDelete} onDelete={props.onDelete} />
        ) : (
          <RowActions
            disabled={chat.busy}
            onDuplicate={props.onDuplicate}
            onOpenInEditor={props.onOpenInEditor}
            onDelete={props.onAskDelete}
          />
        )}
      </div>
    </div>
  );
});
