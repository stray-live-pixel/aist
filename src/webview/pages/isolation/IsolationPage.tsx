import { ExternalLink, FolderOpen, MessageSquare, Play, RefreshCw, Server, Square, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { agentActions } from '../../shared/lib/agentActions';
import { useAgentState } from '../../shared/lib/agentState';
import { isIsolationSessionActive } from '../../shared/lib/isolation';
import type { IsolationSessionEvent, IsolationSessionStatus, IsolationSessionSummary } from '../../shared/types';
import { Badge, Button, Text, TextArea } from '../../shared/ui';
import type { BadgeTone } from '../../shared/ui';
import styles from './IsolationPage.module.scss';
import { shouldEnableIsolationStandardChat } from './shouldEnableIsolationStandardChat';

export function IsolationPage({ onClose }: { onClose(): void }) {
  const state = useAgentState();
  const [prompt, setPrompt] = useState('');
  const [continueBySessionId, setContinueBySessionId] = useState<Record<string, string>>({});
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const sessions = useMemo(
    () => [...state.isolationSessions].sort((left, right) => right.updatedAt - left.updatedAt),
    [state.isolationSessions]
  );
  const selectedSession = useMemo(
    () =>
      sessions.find((session) => session.sessionId === selectedSessionId) ||
      sessions.find((session) => isIsolationSessionActive({ status: session.status })) ||
      sessions[0],
    [selectedSessionId, sessions]
  );

  useEffect(() => {
    if (!selectedSessionId && selectedSession) {
      setSelectedSessionId(selectedSession.sessionId);
    }
  }, [selectedSession, selectedSessionId]);

  useEffect(() => {
    if (!selectedSession) {
      return;
    }

    agentActions.loadIsolationSessionEvents(selectedSession.sessionId);
    if (!isIsolationSessionActive({ status: selectedSession.status })) {
      return;
    }

    const timer = window.setInterval(() => {
      agentActions.loadIsolationSessionEvents(selectedSession.sessionId);
    }, 2500);
    return () => window.clearInterval(timer);
  }, [selectedSession]);

  function start() {
    const nextPrompt = prompt.trim();
    if (!nextPrompt) return;
    agentActions.startIsolationSession(nextPrompt);
    setPrompt('');
  }

  function continueSession(sessionId: string) {
    const nextPrompt = (continueBySessionId[sessionId] || '').trim();
    if (!nextPrompt) return;
    agentActions.continueIsolationSession(sessionId, nextPrompt);
    setContinueBySessionId((current) => ({ ...current, [sessionId]: '' }));
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Server size={18} />
          <div>
            <h1>Isolated agents</h1>
            <Text variant="caption">Detached Docker sessions managed by daemon. VS Code may reconnect later.</Text>
          </div>
        </div>
        <div className={styles.headerActions}>
          <Button
            size="sm"
            leadingIcon={<RefreshCw size={14} />}
            onClick={() => agentActions.refreshIsolationSessions()}
          >
            Refresh
          </Button>
          <Button size="sm" variant="ghost" iconOnly title="Close" onClick={onClose}>
            <X size={15} />
          </Button>
        </div>
      </header>

      <section className={styles.launch}>
        <TextArea
          label="Task"
          rows={4}
          placeholder="Describe the isolated implementation task..."
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
        />
        <div className={styles.launchActions}>
          <Button variant="primary" leadingIcon={<Play size={14} />} disabled={!prompt.trim()} onClick={start}>
            Start detached run
          </Button>
          <Text variant="caption">
            AIST will create a standard chat for this Docker run. Open that chat to watch tool calls and answer flow
            as if the agent worked locally.
          </Text>
        </div>
      </section>

      <section className={styles.sessions}>
        {sessions.length ? (
          sessions.map((session) => (
            <article key={session.sessionId} className={styles.session}>
              <div className={styles.sessionHeader}>
                <div className={styles.sessionTitle}>
                  <strong>{session.branchName}</strong>
                  <Badge tone={getStatusTone(session.status)}>{session.status}</Badge>
                </div>
                <Text variant="caption">
                  {session.provider} · attempt {session.attempt} · {new Date(session.updatedAt).toLocaleString()}
                </Text>
              </div>

              <div className={styles.metaGrid}>
                <Meta label="Session" value={session.sessionId} />
                <Meta label="Chat" value={session.chatId || 'creating'} />
                <Meta label="Container" value={session.containerName || session.containerId || 'not created'} />
                <Meta label="Worktree" value={session.worktreePath || 'pending'} />
                <Meta label="Commit" value={session.commitSha || 'pending'} />
                <Meta label="PR" value={session.prUrl || 'pending'} />
              </div>

              {session.stage ? <div className={styles.stage}>{session.stage}</div> : null}

              <div className={styles.chatHint}>
                <MessageSquare size={14} />
                <span>
                  Standard chat is the primary live view for this Docker agent. Daemon logs below are kept for
                  diagnostics only.
                </span>
                <Button
                  size="sm"
                  variant="primary"
                  leadingIcon={<MessageSquare size={13} />}
                  disabled={!shouldEnableIsolationStandardChat({ session })}
                  onClick={() => agentActions.openIsolationChat(session.sessionId)}
                >
                  Open standard chat
                </Button>
              </div>

              {session.error ? <div className={styles.error}>{session.error}</div> : null}

              <Text variant="caption" className={styles.promptPreview}>
                {session.prompt}
              </Text>

              <div className={styles.sessionActions}>
                {session.worktreePath ? (
                  <Button
                    size="sm"
                    leadingIcon={<FolderOpen size={13} />}
                    onClick={() => agentActions.openIsolationWorktree(session.sessionId)}
                  >
                    Open worktree
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="primary"
                  leadingIcon={<MessageSquare size={13} />}
                  disabled={!shouldEnableIsolationStandardChat({ session })}
                  onClick={() => agentActions.openIsolationChat(session.sessionId)}
                >
                  Open standard chat
                </Button>
                <Button
                  size="sm"
                  variant={selectedSessionId === session.sessionId ? 'secondary' : 'ghost'}
                  leadingIcon={<Server size={13} />}
                  onClick={() => {
                    setSelectedSessionId(session.sessionId);
                    agentActions.loadIsolationSessionEvents(session.sessionId);
                  }}
                >
                  Logs
                </Button>
                {session.prUrl ? (
                  <Button
                    size="sm"
                    leadingIcon={<ExternalLink size={13} />}
                    onClick={() => agentActions.openIsolationPullRequest(session.sessionId)}
                  >
                    Open PR
                  </Button>
                ) : null}
                {isIsolationSessionActive({ status: session.status }) ? (
                  <Button
                    size="sm"
                    variant="danger"
                    leadingIcon={<Square size={13} />}
                    onClick={() => agentActions.stopIsolationSession(session.sessionId)}
                  >
                    Stop
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  leadingIcon={<Trash2 size={13} />}
                  onClick={() => agentActions.destroyIsolationSession(session.sessionId)}
                >
                  Destroy
                </Button>
              </div>

              {selectedSessionId === session.sessionId ? (
                <IsolationEventChat
                  session={session}
                  events={state.isolationEventsBySessionId[session.sessionId] || []}
                />
              ) : null}

              <div className={styles.continueBox}>
                <TextArea
                  rows={2}
                  placeholder="Add follow-up instructions for this branch..."
                  disabled={isIsolationSessionActive({ status: session.status })}
                  value={continueBySessionId[session.sessionId] || ''}
                  onChange={(event) =>
                    setContinueBySessionId((current) => ({
                      ...current,
                      [session.sessionId]: event.target.value
                    }))
                  }
                />
                <Button
                  size="sm"
                  leadingIcon={<Play size={13} />}
                  disabled={
                    isIsolationSessionActive({ status: session.status }) ||
                    !(continueBySessionId[session.sessionId] || '').trim()
                  }
                  onClick={() => continueSession(session.sessionId)}
                >
                  Continue
                </Button>
              </div>
            </article>
          ))
        ) : (
          <div className={styles.empty}>
            <Server size={22} />
            <Text>No isolated sessions yet.</Text>
          </div>
        )}
      </section>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.meta}>
      <span>{label}</span>
      <strong title={value}>{value}</strong>
    </div>
  );
}

function IsolationEventChat({
  session,
  events
}: {
  session: IsolationSessionSummary;
  events: readonly IsolationSessionEvent[];
}) {
  const sortedEvents = useMemo(() => [...events].sort((left, right) => left.at - right.at), [events]);

  return (
    <section className={styles.eventChat} aria-label={`Daemon logs for ${session.branchName}`}>
      <div className={styles.eventChatHeader}>
        <Server size={14} />
        <div>
          <strong>Daemon logs</strong>
          <span>{sortedEvents.length ? `${sortedEvents.length} events` : 'Waiting for first event...'}</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          leadingIcon={<RefreshCw size={13} />}
          onClick={() => agentActions.loadIsolationSessionEvents(session.sessionId)}
        >
          Refresh
        </Button>
      </div>

      <div className={styles.eventList}>
        {sortedEvents.length ? (
          sortedEvents.map((event, index) => (
            <article
              key={`${event.type}-${event.at}-${index}`}
              className={`${styles.eventBubble} ${getEventClass(event)}`}
            >
              <div className={styles.eventMetaLine}>
                <span>{getEventSpeaker(event)}</span>
                <time>{new Date(event.at).toLocaleTimeString()}</time>
              </div>
              <div className={styles.eventBody}>{formatIsolationEvent(event)}</div>
            </article>
          ))
        ) : (
          <div className={styles.eventEmpty}>
            <Server size={18} />
            <span>The daemon has not returned logs for this session yet.</span>
          </div>
        )}
      </div>
    </section>
  );
}

function getStatusTone(status: IsolationSessionStatus): BadgeTone {
  if (status === 'ready_for_review') return 'success';
  if (isIsolationSessionActive({ status })) return 'warning';
  if (status === 'failed') return 'danger';
  return 'neutral';
}

function getEventSpeaker(event: IsolationSessionEvent): string {
  if (event.type === 'isolation.session.log') {
    if (event.message.startsWith('$ ') || event.message.includes('stdout') || event.message.includes('stderr')) {
      return 'container';
    }
    return event.level === 'error' ? 'agent error' : 'agent';
  }

  return 'daemon';
}

function getEventClass(event: IsolationSessionEvent): string {
  if (event.type === 'isolation.session.log') {
    if (event.level === 'error') return styles.eventBubbleError;
    if (event.level === 'warn') return styles.eventBubbleWarn;
    if (getEventSpeaker(event) === 'container') return styles.eventBubbleContainer;
    return '';
  }

  return styles.eventBubbleSystem;
}

function formatIsolationEvent(event: IsolationSessionEvent): string {
  if (event.type === 'isolation.session.log') {
    return event.message;
  }

  if (event.type === 'isolation.session.created') {
    return `Session created on ${event.session.branchName}.`;
  }

  if (event.type === 'isolation.session.destroyed') {
    return `Session destroyed. ${event.session.worktreePath ? `Worktree was ${event.session.worktreePath}.` : ''}`;
  }

  return `${event.session.status}${event.session.stage ? `: ${event.session.stage}` : ''}`;
}
