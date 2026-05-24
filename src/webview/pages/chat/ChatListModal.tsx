import { Check, Copy, MessageSquare, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { vscode } from '../../shared/lib/vscode';
import type { AgentLanguage, ChatSummary } from '../../shared/types';
import { IconButton } from '../../shared/ui/IconButton';

type ChatListModalProps = {
  chats: ChatSummary[];
  activeChatId: string;
  language: AgentLanguage;
  onClose(): void;
};

export function ChatListModal({ chats, activeChatId, language, onClose }: ChatListModalProps) {
  const [deleteTargetId, setDeleteTargetId] = useState<string | undefined>();

  useEffect(() => {
    const closeByEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', closeByEscape);
    return () => document.removeEventListener('keydown', closeByEscape);
  }, [onClose]);

  function selectChat(chatId: string) {
    vscode.postMessage({ type: 'setActiveChat', chatId });
    onClose();
  }

  function duplicateChat(chatId: string) {
    vscode.postMessage({ type: 'duplicateChat', chatId });
    onClose();
  }

  function deleteChat(chatId: string) {
    vscode.postMessage({ type: 'deleteChat', chatId });
    onClose();
  }

  return (
    <div className="tool-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="tool-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <div className="tool-modal-header">
          <div>
            <h2>Chats</h2>
            <p>History is hidden by default to keep the editor focused on messages.</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="secondary-button" onClick={() => vscode.postMessage({ type: 'newChat' })}>
              <Plus size={14} />
              New
            </button>
            <IconButton title="Close chats" onClick={onClose}>
              <X size={15} />
            </IconButton>
          </div>
        </div>

        <div className="grid max-h-[65vh] gap-1 overflow-y-auto p-2">
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
      </section>
    </div>
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

function ChatRow(props: ChatRowProps) {
  const { chat, active, confirmingDelete, language } = props;

  return (
    <div
      className={`flex min-h-11 gap-1 rounded ${active ? 'bg-[var(--vscode-list-activeSelectionBackground)] text-[var(--vscode-list-activeSelectionForeground)]' : ''}`}
    >
      <button
        className="flex min-w-0 flex-1 items-center gap-2 rounded px-2 py-2 text-left text-xs hover:bg-[var(--vscode-list-hoverBackground)]"
        onClick={props.onSelect}
      >
        {active ? (
          <Check size={14} />
        ) : (
          <MessageSquare size={14} className="text-[var(--vscode-descriptionForeground)]" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{chat.title}</span>
          <span
            className={`block truncate text-[11px] ${active ? 'opacity-80' : 'text-[var(--vscode-descriptionForeground)]'}`}
          >
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
}

function RowActions({ disabled, onDuplicate, onDelete }: { disabled: boolean; onDuplicate(): void; onDelete(): void }) {
  return (
    <>
      <IconButton title="Duplicate chat" disabled={disabled} onClick={onDuplicate}>
        <Copy size={14} />
      </IconButton>
      <IconButton title="Delete chat" disabled={disabled} onClick={onDelete}>
        <Trash2 size={14} />
      </IconButton>
    </>
  );
}

function DeleteActions({ onCancel, onDelete }: { onCancel(): void; onDelete(): void }) {
  return (
    <>
      <IconButton title="Confirm delete" onClick={onDelete}>
        <Check size={14} />
      </IconButton>
      <IconButton title="Cancel delete" onClick={onCancel}>
        <X size={14} />
      </IconButton>
    </>
  );
}

function formatChatMeta(chat: ChatSummary, language: AgentLanguage): string {
  const messageLabel =
    language === 'ru'
      ? `${chat.messageCount} сообщ.`
      : chat.messageCount === 1
        ? '1 message'
        : `${chat.messageCount} messages`;
  return `${messageLabel} - ${formatChatDate(chat.lastMessageAt, language)}`;
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
