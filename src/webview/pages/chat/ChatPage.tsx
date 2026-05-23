import { Check, ChevronDown, Copy, ExternalLink, MessageSquare, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Composer } from '../../features/send-message/Composer';
import { vscode } from '../../shared/lib/vscode';
import type { AgentLanguage, AgentState, ChatSummary } from '../../shared/types';
import { IconButton } from '../../shared/ui/IconButton';
import { MessageList } from '../../widgets/message-list/MessageList';

type ChatPageProps = {
  state: AgentState;
};

export function ChatPage({ state }: ChatPageProps) {
  const activeMode = state.agentModes.find((mode) => mode.id === state.agentMode);
  const chatSelectRef = useRef<HTMLDivElement>(null);
  const [chatSelectOpen, setChatSelectOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | undefined>();
  const chats = useMemo(
    () => [...state.chats].sort((a, b) => b.lastMessageAt - a.lastMessageAt || b.updatedAt - a.updatedAt),
    [state.chats]
  );
  const activeSummary = chats.find((chat) => chat.id === state.activeChat.id);

  useEffect(() => {
    if (!chatSelectOpen) {
      setDeleteTargetId(undefined);
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!chatSelectRef.current?.contains(event.target as Node)) {
        setChatSelectOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setChatSelectOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [chatSelectOpen]);

  useEffect(() => {
    if (deleteTargetId && !chats.some((chat) => chat.id === deleteTargetId)) {
      setDeleteTargetId(undefined);
    }
  }, [chats, deleteTargetId]);

  function selectChat(chatId: string) {
    vscode.postMessage({ type: 'setActiveChat', chatId });
    setChatSelectOpen(false);
    setDeleteTargetId(undefined);
  }

  function duplicateChat(chatId: string) {
    vscode.postMessage({ type: 'duplicateChat', chatId });
    setChatSelectOpen(false);
    setDeleteTargetId(undefined);
  }

  function deleteChat(chatId: string) {
    vscode.postMessage({ type: 'deleteChat', chatId });
    setChatSelectOpen(false);
    setDeleteTargetId(undefined);
  }

  return (
    <div className="flex h-screen flex-col bg-[var(--vscode-editor-background)] text-[var(--vscode-foreground)]">
      <header className="border-b border-[var(--agent-border)] bg-[var(--vscode-sideBar-background)] px-3 py-2">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-2">
          <div ref={chatSelectRef} className="relative min-w-0 flex-1">
            <button
              type="button"
              className="flex h-8 w-full min-w-0 items-center justify-between gap-2 rounded border border-[var(--agent-input-border)] bg-[var(--vscode-dropdown-background)] px-2 text-left text-xs text-[var(--vscode-dropdown-foreground)] outline-none focus:border-[var(--vscode-focusBorder)]"
              aria-haspopup="listbox"
              aria-expanded={chatSelectOpen}
              onClick={() => setChatSelectOpen((value) => !value)}
            >
              <MessageSquare size={14} className="shrink-0 text-[var(--vscode-descriptionForeground)]" />
              <span className="min-w-0 flex-1 truncate">{activeSummary?.title || state.activeChat.title}</span>
              <span className="shrink-0 text-[11px] text-[var(--vscode-descriptionForeground)]">{chats.length}</span>
              <ChevronDown size={14} className={`shrink-0 transition-transform ${chatSelectOpen ? 'rotate-180' : ''}`} />
            </button>

            {chatSelectOpen ? (
              <div
                className="absolute left-0 top-full z-30 mt-2 grid max-h-72 w-[min(30rem,calc(100vw-1.5rem))] gap-1 overflow-y-auto rounded-md border border-[var(--agent-border)] bg-[var(--vscode-dropdown-background)] p-1 shadow-lg"
                role="listbox"
                aria-label="Chats"
              >
                {chats.map((chat) => {
                  const active = chat.id === state.activeChat.id;
                  const confirmingDelete = deleteTargetId === chat.id;
                  return (
                    <div
                      key={chat.id}
                      className={`flex min-h-10 min-w-0 items-stretch gap-1 rounded ${
                        active ? 'bg-[var(--vscode-list-activeSelectionBackground)] text-[var(--vscode-list-activeSelectionForeground)]' : ''
                      }`}
                    >
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-2 rounded px-2 py-2 text-left text-xs outline-none hover:bg-[var(--vscode-list-hoverBackground)] focus:bg-[var(--vscode-list-focusBackground)]"
                        role="option"
                        aria-selected={active}
                        onClick={() => selectChat(chat.id)}
                      >
                        <Check size={14} className={`shrink-0 ${active ? 'opacity-100' : 'opacity-0'}`} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{chat.title}</span>
                          <span className={`block truncate text-[11px] ${active ? 'opacity-80' : 'text-[var(--vscode-descriptionForeground)]'}`}>
                            {formatChatMeta(chat, state.agentLanguage)}
                          </span>
                        </span>
                      </button>

                      {confirmingDelete ? (
                        <>
                          <button
                            type="button"
                            className="flex h-auto w-7 shrink-0 items-center justify-center rounded text-[var(--vscode-button-foreground)] outline-none hover:bg-[var(--vscode-button-hoverBackground)] focus:bg-[var(--vscode-list-focusBackground)]"
                            title="Confirm delete"
                            aria-label="Confirm delete"
                            onClick={() => deleteChat(chat.id)}
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            className="flex h-auto w-7 shrink-0 items-center justify-center rounded outline-none hover:bg-[var(--vscode-list-hoverBackground)] focus:bg-[var(--vscode-list-focusBackground)]"
                            title="Cancel delete"
                            aria-label="Cancel delete"
                            onClick={() => setDeleteTargetId(undefined)}
                          >
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="flex h-auto w-7 shrink-0 items-center justify-center rounded outline-none hover:bg-[var(--vscode-list-hoverBackground)] focus:bg-[var(--vscode-list-focusBackground)] disabled:cursor-not-allowed disabled:opacity-50"
                            title="Duplicate chat"
                            aria-label="Duplicate chat"
                            disabled={chat.busy}
                            onClick={() => duplicateChat(chat.id)}
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            type="button"
                            className="flex h-auto w-7 shrink-0 items-center justify-center rounded text-[var(--vscode-errorForeground)] outline-none hover:bg-[var(--vscode-list-hoverBackground)] focus:bg-[var(--vscode-list-focusBackground)] disabled:cursor-not-allowed disabled:opacity-50"
                            title="Delete chat"
                            aria-label="Delete chat"
                            disabled={chat.busy}
                            onClick={() => setDeleteTargetId(chat.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
          <IconButton
            title="Open this chat in editor"
            onClick={() => vscode.postMessage({ type: 'openChatInEditor', chatId: state.activeChat.id })}
          >
            <ExternalLink size={15} />
          </IconButton>
        </div>
        <div className="mx-auto mt-2 max-w-4xl rounded border border-[var(--agent-border)] bg-[var(--vscode-input-background)] px-3 py-2 text-xs text-[var(--vscode-descriptionForeground)]">
          <div className="font-semibold text-[var(--vscode-foreground)]">
            Applied instructions: {activeMode?.label || state.agentMode}
          </div>
          <div className="mt-1 whitespace-pre-wrap leading-5">{activeMode?.instructions || 'No additional instructions.'}</div>
        </div>
      </header>
      <MessageList messages={state.activeChat.messages} tools={state.tools} />
      <Composer
        busy={state.activeChat.busy}
        model={state.activeChat.model}
        models={state.models}
        activity={state.activeChat.activity}
        reasoningEffort={state.reasoningEffort}
        toolsCount={state.tools.length}
      />
    </div>
  );
}

function formatChatMeta(chat: ChatSummary, language: AgentLanguage): string {
  const messageLabel = language === 'ru' ? `${chat.messageCount} сообщ.` : chat.messageCount === 1 ? '1 message' : `${chat.messageCount} messages`;
  return `${messageLabel} - ${formatChatDate(chat.lastMessageAt, language)}`;
}

function formatChatDate(timestamp: number, language: AgentLanguage): string {
  const date = new Date(timestamp);
  const now = new Date();
  const locale = language === 'ru' ? 'ru-RU' : 'en-US';
  const sameDay =
    date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();

  return new Intl.DateTimeFormat(
    locale,
    sameDay
      ? { hour: '2-digit', minute: '2-digit' }
      : { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }
  ).format(date);
}
