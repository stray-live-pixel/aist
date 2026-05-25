import { Check, Copy, MessageSquare, Plus, Trash2, X } from 'lucide-react';
import { memo, useEffect, useState } from 'react';

import { pluralKey, translate, useI18n } from '../../shared/i18n';
import { agentActions } from '../../shared/lib/agentActions';
import type { AgentLanguage, ChatSummary } from '../../shared/types';
import { Button, ModalBackdrop, ModalHeader, ModalSurface } from '../../shared/ui';
import { IconButton } from '../../shared/ui/IconButton';
import styles from './ChatPage.module.scss';

type ChatListModalProps = {
  chats: ChatSummary[];
  activeChatId: string;
  language: AgentLanguage;
  onClose(): void;
};

/**
 * Что это: модалка выбора, копирования и удаления чатов.
 * Зачем нужно: список чатов может быть длинным, поэтому строки списка memo-изированы и получают уже готовые callbacks от модалки.
 */
export function ChatListModal({ chats, activeChatId, language, onClose }: ChatListModalProps) {
  const { t } = useI18n();
  const [deleteTargetId, setDeleteTargetId] = useState<string | undefined>();

  useEffect(() => {
    const closeByEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', closeByEscape);
    return () => document.removeEventListener('keydown', closeByEscape);
  }, [onClose]);

  function selectChat(chatId: string) {
    agentActions.setActiveChat(chatId);
    onClose();
  }

  function duplicateChat(chatId: string) {
    agentActions.duplicateChat(chatId);
    onClose();
  }

  function deleteChat(chatId: string) {
    agentActions.deleteChat(chatId);
    onClose();
  }

  return (
    <ModalBackdrop role="presentation" onMouseDown={onClose}>
      <ModalSurface role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <ModalHeader>
          <div>
            <h2>{t('chatList.title')}</h2>
            <p>{t('chatList.description')}</p>
          </div>
          <div className={styles.modalHeaderActions}>
            <Button variant="secondary" leadingIcon={<Plus size={14} />} onClick={agentActions.newChat}>
              {t('chatList.new')}
            </Button>
            <IconButton title={t('chatList.close')} onClick={onClose}>
              <X size={15} />
            </IconButton>
          </div>
        </ModalHeader>

        <div className={styles.chatList}>
          {chats.map((chat) => (
            <ChatRow
              key={chat.id}
              chat={chat}
              active={chat.id === activeChatId}
              confirmingDelete={deleteTargetId === chat.id}
              language={language}
              onSelect={() => selectChat(chat.id)}
              onDuplicate={() => duplicateChat(chat.id)}
              onAskDelete={() => setDeleteTargetId(chat.id)}
              onCancelDelete={() => setDeleteTargetId(undefined)}
              onDelete={() => deleteChat(chat.id)}
            />
          ))}
        </div>
      </ModalSurface>
    </ModalBackdrop>
  );
}

type ChatRowProps = {
  chat: ChatSummary;
  active: boolean;
  confirmingDelete: boolean;
  language: AgentLanguage;
  onSelect(): void;
  onDuplicate(): void;
  onAskDelete(): void;
  onCancelDelete(): void;
  onDelete(): void;
};

const ChatRow = memo(function ChatRow(props: ChatRowProps) {
  const { chat, active, confirmingDelete, language } = props;

  return (
    <div className={active ? `${styles.chatRow} ${styles.chatRowActive}` : styles.chatRow}>
      <button className={styles.chatRowButton} onClick={props.onSelect}>
        {active ? <Check size={14} /> : <MessageSquare size={14} className={styles.chatRowIconMuted} />}
        <span className={styles.chatRowContent}>
          <span className={styles.chatRowTitle} title={chat.title}>
            {chat.title}
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
      {confirmingDelete ? (
        <DeleteActions onCancel={props.onCancelDelete} onDelete={props.onDelete} />
      ) : (
        <RowActions disabled={chat.busy} onDuplicate={props.onDuplicate} onDelete={props.onAskDelete} />
      )}
    </div>
  );
});

const RowActions = memo(function RowActions({
  disabled,
  onDuplicate,
  onDelete
}: {
  disabled: boolean;
  onDuplicate(): void;
  onDelete(): void;
}) {
  const { t } = useI18n();

  return (
    <>
      <IconButton title={t('chatList.duplicate')} disabled={disabled} onClick={onDuplicate}>
        <Copy size={14} />
      </IconButton>
      <IconButton title={t('chatList.delete')} disabled={disabled} onClick={onDelete}>
        <Trash2 size={14} />
      </IconButton>
    </>
  );
});

const DeleteActions = memo(function DeleteActions({ onCancel, onDelete }: { onCancel(): void; onDelete(): void }) {
  const { t } = useI18n();

  return (
    <>
      <IconButton title={t('common.confirmDelete')} onClick={onDelete}>
        <Check size={14} />
      </IconButton>
      <IconButton title={t('common.cancelDelete')} onClick={onCancel}>
        <X size={14} />
      </IconButton>
    </>
  );
});

function formatChatMeta(chat: ChatSummary, language: AgentLanguage): string {
  const messageLabel = translateChatMetaMessage(language, chat.messageCount);
  return `${messageLabel} - ${formatChatDate(chat.lastMessageAt, language)}`;
}

function translateChatMetaMessage(language: AgentLanguage, count: number): string {
  return translate(language, pluralKey(language, 'chatList.message', count), { count });
}

function formatChatDate(timestamp: number, language: AgentLanguage): string {
  const date = new Date(timestamp);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  return new Intl.DateTimeFormat(
    language === 'ru' ? 'ru-RU' : 'en-US',
    sameDay
      ? { hour: '2-digit', minute: '2-digit' }
      : { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }
  ).format(date);
}
