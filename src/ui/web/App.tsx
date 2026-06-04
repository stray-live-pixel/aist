import { Check, Play, Plus, RefreshCw, Square, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';

import type { ChatMessage } from '../../core/shared/types/types';
import { Button, EmptyState, StatusPill, Toolbar, formatRelativeTime, previewText } from '../shared';
import type {
  AgentWebChat,
  AgentWebChatAskResult,
  AgentWebChatCreateResult,
  AgentWebChatGetResult,
  AgentWebEventMessage,
  AgentWebModelsResult,
  AgentWebStateResult
} from '../shared';
import { rpc, subscribeToEvents } from './client';

type LoadStatus = 'loading' | 'ready' | 'error';

export function App() {
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [error, setError] = useState<string>('');
  const [state, setState] = useState<AgentWebStateResult | null>(null);
  const [activeChat, setActiveChat] = useState<AgentWebChat | null>(null);
  const [prompt, setPrompt] = useState('');
  const [models, setModels] = useState<AgentWebModelsResult['models']>([]);
  const [eventStatus, setEventStatus] = useState<'connected' | 'disconnected'>('disconnected');

  const activeRun = useMemo(
    () => state?.activeRuns.find((run) => run.chatId === activeChat?.id),
    [activeChat?.id, state?.activeRuns]
  );

  const refreshState = useCallback(
    async (preferredChatId?: string) => {
      const next = await rpc<AgentWebStateResult>('state.get');
      setState(next);
      const chatId = preferredChatId || activeChat?.id || next.chats[0]?.id;
      if (chatId) {
        const chat = await rpc<AgentWebChatGetResult>('chat.get', { chatId });
        setActiveChat(chat.chat);
      } else {
        setActiveChat(null);
      }
      setStatus('ready');
    },
    [activeChat?.id]
  );

  useEffect(() => {
    void Promise.all([
      refreshState(),
      rpc<AgentWebModelsResult>('models.list', { provider: 'all' }).then((result) => setModels(result.models))
    ]).catch((loadError) => {
      setStatus('error');
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    });
  }, []);

  useEffect(() => {
    return subscribeToEvents(
      (message: AgentWebEventMessage) => {
        setEventStatus('connected');
        if (message.type === 'daemon.event') {
          void refreshState(getEventChatId(message.event) || activeChat?.id).catch((eventError) => {
            setError(eventError instanceof Error ? eventError.message : String(eventError));
          });
        }
      },
      () => setEventStatus('disconnected')
    );
  }, [activeChat?.id, refreshState]);

  async function createChat() {
    const created = await rpc<AgentWebChatCreateResult>('chat.create');
    await refreshState(created.chat.id);
  }

  async function ask() {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) {
      return;
    }

    let chat = activeChat;
    if (!chat) {
      const created = await rpc<AgentWebChatCreateResult>('chat.create');
      chat = created.chat;
      setActiveChat(chat);
    }

    setPrompt('');
    await rpc<AgentWebChatAskResult>('chat.ask', { chatId: chat.id, prompt: cleanPrompt });
    await refreshState(chat.id);
  }

  async function stop() {
    await rpc('chat.stop', { chatId: activeChat?.id });
    await refreshState(activeChat?.id);
  }

  async function setModel(model: string) {
    if (!activeChat || !model) {
      return;
    }

    const result = await rpc<AgentWebChatGetResult>('chat.setModel', { chatId: activeChat.id, model });
    setActiveChat(result.chat);
    await refreshState(activeChat.id);
  }

  async function resolveApproval(messageId: string, decision: 'approve' | 'deny-stop' | 'deny-continue') {
    await rpc('approval.resolve', { messageId, decision });
    await refreshState(activeChat?.id);
  }

  if (status === 'loading') {
    return <div className="loading">Starting AIST web UI...</div>;
  }

  if (status === 'error') {
    return (
      <main className="errorPage">
        <h1>AIST web</h1>
        <p>{error}</p>
        <Button onClick={() => window.location.reload()}>Reload</Button>
      </main>
    );
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div>
            <h1>AIST</h1>
            <span>{state?.workspaceRoot}</span>
          </div>
          <StatusPill tone={eventStatus === 'connected' ? 'success' : 'warning'}>{eventStatus}</StatusPill>
        </div>
        <Toolbar>
          <Button tone="primary" onClick={createChat}>
            <Plus size={16} /> New
          </Button>
          <Button onClick={() => void refreshState(activeChat?.id)}>
            <RefreshCw size={16} /> Refresh
          </Button>
        </Toolbar>
        <div className="chatList">
          {state?.chats.map((chat) => (
            <button
              key={chat.id}
              className={`chatListItem ${chat.id === activeChat?.id ? 'chatListItem_active' : ''}`}
              onClick={() => void refreshState(chat.id)}
            >
              <strong>{chat.title}</strong>
              <span>{chat.lastUserMessage || chat.model}</span>
              <small>
                {chat.busy ? 'running' : `${chat.messageCount} messages`} · {formatRelativeTime(chat.updatedAt)}
              </small>
            </button>
          ))}
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h2>{activeChat?.title || 'No chat yet'}</h2>
            <span>{activeChat?.model || 'Create a chat to begin'}</span>
          </div>
          <Toolbar>
            <select
              value={activeChat?.model || ''}
              onChange={(event) => void setModel(event.target.value)}
              disabled={!activeChat || Boolean(activeRun)}
            >
              <option value="">Model</option>
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name || model.id}
                </option>
              ))}
            </select>
            {activeRun ? (
              <Button tone="danger" onClick={stop}>
                <Square size={15} /> Stop
              </Button>
            ) : null}
          </Toolbar>
        </header>

        <div className="messages">
          {!activeChat ? (
            <EmptyState title="No chat selected">Create a chat and send the first task to the agent.</EmptyState>
          ) : null}
          {activeChat?.messages.map((message) => (
            <MessageView key={message.id} message={message} onResolveApproval={resolveApproval} />
          ))}
        </div>

        <form
          className="composer"
          onSubmit={(event) => {
            event.preventDefault();
            void ask().catch((askError) => setError(askError instanceof Error ? askError.message : String(askError)));
          }}
        >
          {error ? <div className="inlineError">{error}</div> : null}
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Ask AIST to inspect, change, or explain this workspace..."
            rows={4}
          />
          <Toolbar>
            <Button tone="primary" type="submit" disabled={!prompt.trim() || Boolean(activeRun)}>
              <Play size={16} /> Send
            </Button>
            {activeRun ? <StatusPill tone="busy">agent running</StatusPill> : null}
          </Toolbar>
        </form>
      </section>
    </main>
  );
}

function MessageView({
  message,
  onResolveApproval
}: {
  readonly message: ChatMessage;
  readonly onResolveApproval: (messageId: string, decision: 'approve' | 'deny-stop' | 'deny-continue') => Promise<void>;
}) {
  const isApprovalPending = message.role === 'tool' && message.approval === 'pending';
  const tone = message.role === 'error' ? 'danger' : message.status === 'running' ? 'busy' : 'neutral';

  return (
    <article className={`message message_${message.role}`}>
      <div className="messageMeta">
        <StatusPill tone={tone}>{message.role}</StatusPill>
        {message.name ? <strong>{message.name}</strong> : null}
        {message.status ? <span>{message.status}</span> : null}
        <span>{formatRelativeTime(message.createdAt)}</span>
      </div>
      {message.content ? (
        <div className="markdown">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      ) : null}
      {message.reason ? <p className="messageNote">{message.reason}</p> : null}
      {message.args ? <pre>{previewText(message.args)}</pre> : null}
      {message.result ? <pre>{previewText(message.result)}</pre> : null}
      {isApprovalPending ? (
        <Toolbar>
          <Button tone="primary" onClick={() => void onResolveApproval(message.id, 'approve')}>
            <Check size={15} /> Approve
          </Button>
          <Button onClick={() => void onResolveApproval(message.id, 'deny-continue')}>
            <X size={15} /> Deny
          </Button>
          <Button tone="danger" onClick={() => void onResolveApproval(message.id, 'deny-stop')}>
            <Square size={15} /> Stop run
          </Button>
        </Toolbar>
      ) : null}
    </article>
  );
}

function getEventChatId(event: { readonly chatId?: string; readonly type: string }): string | undefined {
  if (typeof event.chatId === 'string') {
    return event.chatId;
  }

  if (event.type === 'run.started' || event.type === 'run.finished') {
    const run = (event as { readonly run?: { readonly chatId?: string } }).run;
    return run?.chatId;
  }

  return undefined;
}
