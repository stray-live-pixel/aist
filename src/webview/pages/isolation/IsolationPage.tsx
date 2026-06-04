import {
  AlertTriangle,
  Clock,
  ExternalLink,
  FileText,
  FolderOpen,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Hash,
  Layers3,
  ListChecks,
  MessageSquare,
  Play,
  RefreshCw,
  Server,
  Square,
  Trash2,
  X
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { type TranslationKey, useI18n } from '../../shared/i18n';
import { agentActions } from '../../shared/lib/agentActions';
import { useAgentState } from '../../shared/lib/agentState';
import { isIsolationSessionActive } from '../../shared/lib/isolation';
import type {
  IsolationFlowModeSummary,
  IsolationSessionEvent,
  IsolationSessionStatus,
  IsolationSessionSummary
} from '../../shared/types';
import {
  Badge,
  Button,
  Callout,
  Card,
  CollapsibleSection,
  EmptyState,
  InfoTile,
  KeyValueGrid,
  LogBlock,
  PipelineSteps,
  Select,
  Text,
  TextArea
} from '../../shared/ui';
import type { BadgeTone, KeyValueItem, PipelineStep, SelectOption } from '../../shared/ui';
import styles from './IsolationPage.module.scss';
import { shouldEnableIsolationStandardChat } from './shouldEnableIsolationStandardChat';

type Translate = ReturnType<typeof useI18n>['t'];
const DEFAULT_VISIBLE_SESSION_COUNT = 20;
const SESSION_LOAD_BATCH_SIZE = 20;

export function IsolationPage({ onClose }: { onClose(): void }) {
  const state = useAgentState();
  const { language, t } = useI18n();
  const [prompt, setPrompt] = useState('');
  const [selectedFlowId, setSelectedFlowId] = useState('');
  const [continueBySessionId, setContinueBySessionId] = useState<Record<string, string>>({});
  const [continueFlowBySessionId, setContinueFlowBySessionId] = useState<Record<string, string>>({});
  const [openLogSessionIds, setOpenLogSessionIds] = useState<readonly string[]>([]);
  const [visibleSessionCount, setVisibleSessionCount] = useState(DEFAULT_VISIBLE_SESSION_COUNT);
  const flowModes = state.isolationFlowModes;
  const locale = language === 'en' ? 'en-US' : 'ru-RU';
  const selectedFlow = useMemo(
    () => flowModes.find((flow) => flow.flowId === selectedFlowId),
    [flowModes, selectedFlowId]
  );
  const sessions = useMemo(
    () => [...state.isolationSessions].sort((left, right) => right.updatedAt - left.updatedAt),
    [state.isolationSessions]
  );
  const visibleSessions = useMemo(() => sessions.slice(0, visibleSessionCount), [sessions, visibleSessionCount]);
  const activeSessionCount = sessions.filter((session) => isIsolationSessionActive({ status: session.status })).length;
  const reviewSessionCount = sessions.filter((session) => session.status === 'ready_for_review').length;
  const flowOptions = useMemo(() => toFlowOptions(flowModes, t), [flowModes, t]);
  const hasMoreSessions = visibleSessions.length < sessions.length;

  useEffect(() => {
    if (!selectedFlowId || flowModes.some((flow) => flow.flowId === selectedFlowId)) {
      return;
    }
    setSelectedFlowId('');
  }, [flowModes, selectedFlowId]);

  useEffect(() => {
    const openSessions = sessions.filter((session) => openLogSessionIds.includes(session.sessionId));
    if (!openSessions.length) {
      return;
    }

    openSessions.forEach((session) => agentActions.loadIsolationSessionEvents(session.sessionId));
    const activeOpenSessions = openSessions.filter((session) => isIsolationSessionActive({ status: session.status }));
    if (!activeOpenSessions.length) {
      return;
    }

    const timer = window.setInterval(() => {
      activeOpenSessions.forEach((session) => agentActions.loadIsolationSessionEvents(session.sessionId));
    }, 2500);
    return () => window.clearInterval(timer);
  }, [openLogSessionIds, sessions]);

  function start() {
    const nextPrompt = prompt.trim();
    if (!nextPrompt) return;
    agentActions.startIsolationSession(nextPrompt, selectedFlowId || undefined);
    setPrompt('');
  }

  function continueSession(sessionId: string) {
    const nextPrompt = (continueBySessionId[sessionId] || '').trim();
    if (!nextPrompt) return;
    agentActions.continueIsolationSession(sessionId, nextPrompt, getContinueFlowId(sessionId));
    setContinueBySessionId((current) => ({ ...current, [sessionId]: '' }));
  }

  function getContinueFlowId(sessionId: string): string | undefined {
    const session = sessions.find((candidate) => candidate.sessionId === sessionId);
    const hasDraftFlow = Object.prototype.hasOwnProperty.call(continueFlowBySessionId, sessionId);
    return (hasDraftFlow ? continueFlowBySessionId[sessionId] : session?.flow?.flowId) || undefined;
  }

  function setLogsOpen(sessionId: string, open: boolean) {
    setOpenLogSessionIds((current) => {
      if (open) {
        return current.includes(sessionId) ? current : [...current, sessionId];
      }
      return current.filter((candidate) => candidate !== sessionId);
    });
    if (open) {
      agentActions.loadIsolationSessionEvents(sessionId);
    }
  }

  return (
    <div className={styles.shell}>
      <main className={styles.content}>
        <header className={styles.header}>
          <Card
            tone="elevated"
            className={styles.headerCard}
            title={
              <span className={styles.titleLine}>
                <Server size={17} />
                <span>{t('isolation.title')}</span>
              </span>
            }
            description={t('isolation.description')}
            actions={
              <div className={styles.actions}>
                <Button
                  size="sm"
                  leadingIcon={<RefreshCw size={14} />}
                  onClick={() => agentActions.refreshIsolationSessions()}
                >
                  {t('isolation.refresh')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  iconOnly
                  title={t('common.close')}
                  aria-label={t('common.close')}
                  onClick={onClose}
                >
                  <X size={15} />
                </Button>
              </div>
            }
          >
            <div className={styles.tileGrid}>
              <InfoTile
                icon={<Server size={14} />}
                title={t('isolation.summary.sessions')}
                value={String(sessions.length)}
                description={t('isolation.summary.sessionsDescription')}
              />
              <InfoTile
                icon={<Clock size={14} />}
                tone={activeSessionCount ? 'warning' : 'neutral'}
                title={t('isolation.summary.active')}
                value={String(activeSessionCount)}
                description={t('isolation.summary.activeDescription')}
              />
              <InfoTile
                icon={<GitPullRequest size={14} />}
                tone={reviewSessionCount ? 'success' : 'neutral'}
                title={t('isolation.summary.review')}
                value={String(reviewSessionCount)}
                description={t('isolation.summary.reviewDescription')}
              />
            </div>
          </Card>
        </header>

        <Card
          tone="accent"
          title={t('isolation.launch.title')}
          description={t('isolation.launch.description')}
          actions={<Badge tone="accent">{t('isolation.launch.flowCount', { count: flowModes.length })}</Badge>}
        >
          <div className={styles.launchGrid}>
            <TextArea
              label={t('isolation.launch.taskLabel')}
              hint={t('isolation.launch.taskHint')}
              rows={5}
              placeholder={t('isolation.launch.taskPlaceholder')}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />
            <div className={styles.flowColumn}>
              <Select
                label={t('isolation.launch.flowLabel')}
                leadingIcon={<Layers3 size={14} />}
                value={selectedFlowId}
                placeholder={t('isolation.flow.default')}
                options={flowOptions}
                searchable={flowModes.length > 5}
                onValueChange={setSelectedFlowId}
              />
              <FlowPreview flow={selectedFlow} flowCount={flowModes.length} t={t} />
            </div>
          </div>
          <div className={styles.launchActions}>
            <Button variant="primary" leadingIcon={<Play size={14} />} disabled={!prompt.trim()} onClick={start}>
              {t('isolation.launch.start')}
            </Button>
            <Text variant="caption">{t('isolation.launch.note')}</Text>
          </div>
        </Card>

        <section className={styles.sessionsSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              <Text variant="title" as="h2">
                {t('isolation.sessions.title')}
              </Text>
              <Text variant="caption">{t('isolation.sessions.description')}</Text>
            </div>
            <Badge>{t('isolation.sessions.count', { count: sessions.length })}</Badge>
          </div>

          {sessions.length ? (
            <div className={styles.sessionList}>
              {visibleSessions.map((session) => (
                <SessionCard
                  key={session.sessionId}
                  continuePrompt={continueBySessionId[session.sessionId] || ''}
                  flowOptions={flowOptions}
                  locale={locale}
                  logsOpen={openLogSessionIds.includes(session.sessionId)}
                  session={session}
                  events={state.isolationEventsBySessionId[session.sessionId] || []}
                  t={t}
                  getContinueFlowId={getContinueFlowId}
                  onContinueFlowChange={(flowId) =>
                    setContinueFlowBySessionId((current) => ({
                      ...current,
                      [session.sessionId]: flowId
                    }))
                  }
                  onContinuePromptChange={(value) =>
                    setContinueBySessionId((current) => ({
                      ...current,
                      [session.sessionId]: value
                    }))
                  }
                  onContinue={() => continueSession(session.sessionId)}
                  onLogsOpenChange={(open) => setLogsOpen(session.sessionId, open)}
                />
              ))}
              {hasMoreSessions ? (
                <div className={styles.loadMoreRow}>
                  <Text variant="caption">
                    {t('isolation.sessions.visibleCount', {
                      visible: visibleSessions.length,
                      total: sessions.length
                    })}
                  </Text>
                  <Button
                    size="sm"
                    onClick={() =>
                      setVisibleSessionCount((current) => Math.min(current + SESSION_LOAD_BATCH_SIZE, sessions.length))
                    }
                  >
                    {t('isolation.sessions.loadMore')}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <Card>
              <EmptyState
                icon={<Server size={24} />}
                title={t('isolation.empty.title')}
                description={t('isolation.empty.description')}
              />
            </Card>
          )}
        </section>
      </main>
    </div>
  );
}

function SessionCard({
  session,
  events,
  flowOptions,
  continuePrompt,
  logsOpen,
  locale,
  t,
  getContinueFlowId,
  onContinuePromptChange,
  onContinueFlowChange,
  onContinue,
  onLogsOpenChange
}: {
  session: IsolationSessionSummary;
  events: readonly IsolationSessionEvent[];
  flowOptions: SelectOption[];
  continuePrompt: string;
  logsOpen: boolean;
  locale: string;
  t: Translate;
  getContinueFlowId(sessionId: string): string | undefined;
  onContinuePromptChange(value: string): void;
  onContinueFlowChange(flowId: string): void;
  onContinue(): void;
  onLogsOpenChange(open: boolean): void;
}) {
  const active = isIsolationSessionActive({ status: session.status });
  const canOpenChat = shouldEnableIsolationStandardChat({ session });
  const eventLog = formatEventLog(events, locale, t);

  return (
    <CollapsibleSection
      tone={active ? 'accent' : 'default'}
      title={
        <span className={styles.titleLine}>
          <GitBranch size={15} />
          <span title={session.branchName}>{session.branchName}</span>
        </span>
      }
      icon={<Server size={14} />}
      meta={<Badge tone={getStatusTone(session.status)}>{getStatusLabel(session.status, t)}</Badge>}
    >
      <div className={styles.sessionBody}>
        <div className={styles.sessionToolbar}>
          <Text variant="caption">{formatSessionSubtitle(session, locale, t)}</Text>
          <SessionActions
            active={active}
            session={session}
            t={t}
            onStop={() => agentActions.stopIsolationSession(session.sessionId)}
            onDestroy={() => agentActions.destroyIsolationSession(session.sessionId)}
          />
        </div>

        <div className={styles.tileGrid}>
          <InfoTile
            icon={<Clock size={14} />}
            tone={getStatusTone(session.status)}
            title={t('isolation.session.currentStep')}
            value={session.stage || getStatusLabel(session.status, t)}
            description={t('isolation.session.updatedAt', { value: formatDateTime(session.updatedAt, locale) })}
          />
          <InfoTile
            icon={<Layers3 size={14} />}
            title={t('isolation.session.flow')}
            value={session.flow?.title || t('isolation.flow.default')}
            description={
              session.flow
                ? t('isolation.session.flowStages', { count: session.flow.stageCount })
                : t('isolation.flow.singleStepDescription')
            }
          />
          <InfoTile
            icon={<GitCommit size={14} />}
            tone={session.prUrl || session.commitSha ? 'success' : 'neutral'}
            title={t('isolation.session.result')}
            value={
              session.prUrl
                ? t('isolation.session.resultPr')
                : session.commitSha
                  ? t('isolation.session.resultCommit')
                  : t('isolation.value.pending')
            }
            description={session.prUrl || session.commitSha || t('isolation.session.resultDescription')}
          />
        </div>

        <Callout
          tone="accent"
          icon={<MessageSquare size={15} />}
          title={t('isolation.session.chatTitle')}
          actions={
            <Button
              size="sm"
              variant="primary"
              leadingIcon={<MessageSquare size={13} />}
              disabled={!canOpenChat}
              onClick={() => agentActions.openIsolationChat(session.sessionId)}
            >
              {t('isolation.action.openChat')}
            </Button>
          }
        >
          {t('isolation.session.chatDescription')}
        </Callout>

        {session.error ? (
          <Callout tone="danger" icon={<AlertTriangle size={15} />} title={t('isolation.session.errorTitle')}>
            {session.error}
          </Callout>
        ) : null}

        {session.stage ? (
          <Callout tone="neutral" icon={<Clock size={15} />} title={t('isolation.session.stageTitle')}>
            {session.stage}
          </Callout>
        ) : null}

        {session.flow?.stages?.length ? <FlowProgress flow={session.flow} t={t} /> : null}

        <CollapsibleSection
          title={t('isolation.prompt.title')}
          description={t('isolation.prompt.description')}
          icon={<FileText size={14} />}
          collapsedPreview={truncateText(session.prompt, 140)}
        >
          <LogBlock compact value={session.prompt} />
        </CollapsibleSection>

        <CollapsibleSection
          title={t('isolation.details.title')}
          description={t('isolation.details.description')}
          icon={<Hash size={14} />}
          collapsedPreview={t('isolation.details.preview', {
            sessionId: session.sessionId,
            worktree: session.worktreePath || t('isolation.value.pending')
          })}
        >
          <KeyValueGrid items={getSessionDetails(session, locale, t)} />
        </CollapsibleSection>

        <CollapsibleSection
          title={t('isolation.logs.title')}
          description={t('isolation.logs.description')}
          icon={<ListChecks size={14} />}
          meta={<Badge>{t('isolation.logs.eventCount', { count: events.length })}</Badge>}
          collapsedPreview={t('isolation.logs.preview')}
          open={logsOpen}
          actions={
            <Button
              size="sm"
              variant="ghost"
              leadingIcon={<RefreshCw size={13} />}
              onClick={() => agentActions.loadIsolationSessionEvents(session.sessionId)}
            >
              {t('isolation.refresh')}
            </Button>
          }
          onOpenChange={onLogsOpenChange}
        >
          <LogBlock
            compact
            label={t('isolation.logs.blockLabel')}
            value={eventLog}
            emptyLabel={t('isolation.logs.empty')}
            copyLabel={t('common.copy')}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title={t('isolation.followup.title')}
          description={active ? t('isolation.followup.activeDescription') : t('isolation.followup.description')}
          icon={<Play size={14} />}
          collapsedPreview={t('isolation.followup.preview')}
        >
          {active ? (
            <Callout tone="warning" icon={<Clock size={15} />}>
              {t('isolation.followup.activeHint')}
            </Callout>
          ) : null}
          <div className={styles.continueGrid}>
            <TextArea
              label={t('isolation.followup.promptLabel')}
              rows={3}
              placeholder={t('isolation.followup.promptPlaceholder')}
              disabled={active}
              value={continuePrompt}
              onChange={(event) => onContinuePromptChange(event.target.value)}
            />
            <Select
              size="sm"
              label={t('isolation.followup.flowLabel')}
              leadingIcon={<GitBranch size={12} />}
              value={getContinueFlowId(session.sessionId) || ''}
              placeholder={t('isolation.flow.default')}
              disabled={active}
              options={flowOptions}
              searchable={flowOptions.length > 6}
              onValueChange={onContinueFlowChange}
            />
          </div>
          <div className={styles.continueActions}>
            <Button
              size="sm"
              leadingIcon={<Play size={13} />}
              disabled={active || !continuePrompt.trim()}
              onClick={onContinue}
            >
              {t('isolation.action.continue')}
            </Button>
          </div>
        </CollapsibleSection>
      </div>
    </CollapsibleSection>
  );
}

function SessionActions({
  session,
  active,
  t,
  onStop,
  onDestroy
}: {
  session: IsolationSessionSummary;
  active: boolean;
  t: Translate;
  onStop(): void;
  onDestroy(): void;
}) {
  return (
    <div className={styles.actions}>
      {session.worktreePath ? (
        <Button
          size="sm"
          leadingIcon={<FolderOpen size={13} />}
          onClick={() => agentActions.openIsolationWorktree(session.sessionId)}
        >
          {t('isolation.action.openWorktree')}
        </Button>
      ) : null}
      {session.prUrl ? (
        <Button
          size="sm"
          leadingIcon={<ExternalLink size={13} />}
          onClick={() => agentActions.openIsolationPullRequest(session.sessionId)}
        >
          {t('isolation.action.openPr')}
        </Button>
      ) : null}
      {active ? (
        <Button size="sm" variant="danger" leadingIcon={<Square size={13} />} onClick={onStop}>
          {t('isolation.action.stop')}
        </Button>
      ) : null}
      <Button size="sm" variant="ghost" leadingIcon={<Trash2 size={13} />} onClick={onDestroy}>
        {t('isolation.action.destroy')}
      </Button>
    </div>
  );
}

function FlowPreview({
  flow,
  flowCount,
  t
}: {
  flow: IsolationFlowModeSummary | undefined;
  flowCount: number;
  t: Translate;
}) {
  if (!flow) {
    return (
      <Callout tone="neutral" icon={<Layers3 size={15} />} title={t('isolation.flow.default')}>
        {flowCount ? t('isolation.flow.savedAvailable', { count: flowCount }) : t('isolation.flow.noneAvailable')}
      </Callout>
    );
  }

  return (
    <Callout
      tone={flow.sourceKind === 'legacy' ? 'warning' : 'success'}
      icon={<Layers3 size={15} />}
      title={flow.title}
      actions={
        <Badge tone={flow.sourceKind === 'legacy' ? 'warning' : 'success'}>
          {getFlowSourceLabel(flow.sourceKind, t)}
        </Badge>
      }
    >
      {formatFlowPreview(flow, t)}
    </Callout>
  );
}

function FlowProgress({ flow, t }: { flow: NonNullable<IsolationSessionSummary['flow']>; t: Translate }) {
  const steps: PipelineStep[] =
    flow.stages?.map((stage) => ({
      id: String(stage.index),
      title: `${stage.index}. ${stage.title}`,
      status: stage.status,
      statusLabel: getFlowStageStatusLabel(stage.status, t),
      current: flow.currentStageIndex === stage.index
    })) || [];

  return (
    <CollapsibleSection
      title={t('isolation.flowProgress.title')}
      description={flow.title}
      icon={<Layers3 size={14} />}
      meta={
        flow.status ? (
          <Badge tone={getFlowStatusTone(flow.status)}>{getFlowRunStatusLabel(flow.status, t)}</Badge>
        ) : null
      }
      collapsedPreview={t('isolation.flowProgress.preview', { count: steps.length })}
    >
      <PipelineSteps steps={steps} />
      {flow.stages?.some((stage) => stage.error) ? (
        <LogBlock
          compact
          label={t('isolation.flowProgress.errors')}
          value={flow.stages
            .filter((stage) => stage.error)
            .map((stage) => `${stage.index}. ${stage.title}\n${stage.error}`)
            .join('\n\n')}
        />
      ) : null}
    </CollapsibleSection>
  );
}

function toFlowOptions(flows: readonly IsolationFlowModeSummary[], t: Translate): SelectOption[] {
  return [
    { value: '', label: t('isolation.flow.default') },
    ...flows.map((flow) => ({
      value: flow.flowId,
      label: t('isolation.flow.option', { title: flow.title, count: flow.stageCount })
    }))
  ];
}

function getSessionDetails(session: IsolationSessionSummary, locale: string, t: Translate): KeyValueItem[] {
  return [
    textDetail('sessionId', t('isolation.detail.session'), session.sessionId),
    textDetail('taskId', t('isolation.detail.task'), session.taskId),
    textDetail(
      'status',
      t('isolation.detail.status'),
      getStatusLabel(session.status, t),
      getStatusTone(session.status)
    ),
    textDetail('flow', t('isolation.detail.flow'), session.flow?.title || t('isolation.flow.default')),
    textDetail('chat', t('isolation.detail.chat'), session.chatId || t('isolation.value.creating')),
    textDetail('provider', t('isolation.detail.provider'), session.provider),
    textDetail(
      'container',
      t('isolation.detail.container'),
      session.containerName || session.containerId || t('isolation.value.notCreated')
    ),
    textDetail('worktree', t('isolation.detail.worktree'), session.worktreePath || t('isolation.value.pending')),
    textDetail('baseRef', t('isolation.detail.baseRef'), session.baseRef || t('common.notAvailable')),
    textDetail('baseSha', t('isolation.detail.baseSha'), session.baseSha || t('common.notAvailable')),
    textDetail('headSha', t('isolation.detail.headSha'), session.headSha || t('common.notAvailable')),
    textDetail('commit', t('isolation.detail.commit'), session.commitSha || t('isolation.value.pending')),
    textDetail('pr', t('isolation.detail.pr'), session.prUrl || t('isolation.value.pending')),
    textDetail('attempt', t('isolation.detail.attempt'), String(session.attempt)),
    textDetail('createdAt', t('isolation.detail.createdAt'), formatDateTime(session.createdAt, locale)),
    textDetail('updatedAt', t('isolation.detail.updatedAt'), formatDateTime(session.updatedAt, locale)),
    textDetail(
      'startedAt',
      t('isolation.detail.startedAt'),
      session.startedAt ? formatDateTime(session.startedAt, locale) : t('common.notAvailable')
    ),
    textDetail(
      'finishedAt',
      t('isolation.detail.finishedAt'),
      session.finishedAt ? formatDateTime(session.finishedAt, locale) : t('common.notAvailable')
    )
  ];
}

function textDetail(key: string, label: string, value: string, tone: KeyValueItem['tone'] = 'neutral'): KeyValueItem {
  return {
    key,
    label,
    value,
    title: value,
    tone
  };
}

function formatEventLog(events: readonly IsolationSessionEvent[], locale: string, t: Translate): string {
  return [...events]
    .sort((left, right) => left.at - right.at)
    .map((event) => `[${formatTime(event.at, locale)}] ${getEventSpeaker(event, t)}\n${formatIsolationEvent(event, t)}`)
    .join('\n\n');
}

function formatSessionSubtitle(session: IsolationSessionSummary, locale: string, t: Translate): string {
  return t('isolation.session.subtitle', {
    provider: session.provider,
    flow: session.flow?.title || t('isolation.flow.default'),
    attempt: session.attempt,
    updated: formatDateTime(session.updatedAt, locale)
  });
}

function formatFlowPreview(flow: IsolationFlowModeSummary, t: Translate): string {
  const parts = [t('isolation.flow.previewStages', { count: flow.stageCount })];
  if (flow.defaultModel) {
    parts.push(t('isolation.flow.previewModel', { model: flow.defaultModel }));
  }
  if (flow.defaultCodexModel) {
    parts.push(t('isolation.flow.previewCodexModel', { model: flow.defaultCodexModel }));
  }
  if (flow.description) {
    parts.push(flow.description);
  }
  return parts.join(' · ');
}

function getStatusTone(status: IsolationSessionStatus): BadgeTone {
  if (status === 'ready_for_review') return 'success';
  if (isIsolationSessionActive({ status })) return 'warning';
  if (status === 'failed') return 'danger';
  return 'neutral';
}

function getFlowStatusTone(status: NonNullable<NonNullable<IsolationSessionSummary['flow']>['status']>): BadgeTone {
  if (status === 'finished') return 'success';
  if (status === 'error') return 'danger';
  if (status === 'stopped') return 'neutral';
  return 'warning';
}

function getStatusLabel(status: IsolationSessionStatus, t: Translate): string {
  return t(`isolation.status.${status}` as TranslationKey);
}

function getFlowRunStatusLabel(
  status: NonNullable<NonNullable<IsolationSessionSummary['flow']>['status']>,
  t: Translate
): string {
  return t(`isolation.flowRunStatus.${status}` as TranslationKey);
}

function getFlowStageStatusLabel(
  status: NonNullable<NonNullable<IsolationSessionSummary['flow']>['stages']>[number]['status'],
  t: Translate
): string {
  return t(`isolation.flowStageStatus.${status}` as TranslationKey);
}

function getFlowSourceLabel(sourceKind: IsolationFlowModeSummary['sourceKind'], t: Translate): string {
  return t(`isolation.flowSource.${sourceKind}` as TranslationKey);
}

function getEventSpeaker(event: IsolationSessionEvent, t: Translate): string {
  if (event.type === 'isolation.session.log') {
    if (event.message.startsWith('$ ') || event.message.includes('stdout') || event.message.includes('stderr')) {
      return t('isolation.logs.speakerContainer');
    }
    return event.level === 'error' ? t('isolation.logs.speakerAgentError') : t('isolation.logs.speakerAgent');
  }

  return t('isolation.logs.speakerDaemon');
}

function formatIsolationEvent(event: IsolationSessionEvent, t: Translate): string {
  if (event.type === 'isolation.session.log') {
    return event.message;
  }

  if (event.type === 'isolation.session.created') {
    return t('isolation.logs.eventCreated', { branch: event.session.branchName });
  }

  if (event.type === 'isolation.session.destroyed') {
    return event.session.worktreePath
      ? t('isolation.logs.eventDestroyedWithWorktree', { worktree: event.session.worktreePath })
      : t('isolation.logs.eventDestroyed');
  }

  return event.session.stage
    ? t('isolation.logs.eventStatusWithStage', {
        status: getStatusLabel(event.session.status, t),
        stage: event.session.stage
      })
    : getStatusLabel(event.session.status, t);
}

function formatDateTime(value: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value));
}

function formatTime(value: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(new Date(value));
}

function truncateText(value: string, maxLength: number): string {
  const compact = value.replace(/\s+/g, ' ').trim();
  return compact.length > maxLength ? `${compact.slice(0, maxLength - 1)}…` : compact;
}
