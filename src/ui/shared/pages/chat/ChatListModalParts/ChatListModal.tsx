import { Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useI18n } from '../../../i18n';
import { agentActions } from '../../../lib/agentActions';
import { Button, ModalBackdrop, ModalHeader, ModalSurface } from '../../../ui';
import { IconButton } from '../../../ui/IconButton';
import styles from '../ChatPage.module.scss';
import { ChatListModalProps } from './ChatListModalProps';
import { ChatRow } from './ChatRow';

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

  function openChatInEditor(chatId: string) {
    agentActions.openChatInEditor(chatId);
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
              onOpenInEditor={() => openChatInEditor(chat.id)}
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
