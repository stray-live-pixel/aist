import { Database, Download, Play, RefreshCw, Rocket, Square } from 'lucide-react';
import { useMemo, useState } from 'react';

import { autonomousActions } from '../../shared/lib/autonomousActions';
import type {
  AutonomousEngineId,
  AutonomousFlowDefinition,
  AutonomousRunDefinition,
  AutonomousState
} from '../../shared/types';
import {
  Badge,
  Button,
  Card,
  CodeBlock,
  EmptyState,
  PipelineSteps,
  Select,
  Switch,
  Text,
  TextArea
} from '../../shared/ui';
import styles from './AutonomousPage.module.scss';

export type AutonomousPageProps = {
  state: AutonomousState;
  error?: string | null;
};

/**
 * MVP dashboard нативного autonomous runner. Страница намеренно использует только
 * shared UI primitives; layout-specific SCSS отвечает за сетку, а не за новые
 * визуальные компоненты.
 */
export function AutonomousPage({ state, error }: AutonomousPageProps) {
  const [engineId, setEngineId] = useState<AutonomousEngineId>('dry-run');
  const [dryRun, setDryRun] = useState(true);
  const [extraPrompt, setExtraPrompt] = useState('');
  const legacyCount = useMemo(
    () =>
      [...state.definitions.flows, ...state.definitions.runs].filter((definition) => definition.sourceKind === 'legacy')
        .length,
    [state.definitions.flows, state.definitions.runs]
  );

  const launch = { engineId, dryRun, extraPrompt: extraPrompt.trim() || undefined };

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <Text variant="caption">{state.workspaceName}</Text>
          <h1 className={styles.title}>Autonomous Runner</h1>
          <Text variant="caption">Нативные flow/run definitions из `.aist-agent/autonomous`.</Text>
        </div>
        <div className={styles.heroActions}>
          <Badge tone={legacyCount ? 'warning' : 'success'}>{legacyCount} legacy</Badge>
          <Button size="sm" leadingIcon={<RefreshCw size={14} />} onClick={() => autonomousActions.refresh()}>
            Refresh
          </Button>
          <Button
            size="sm"
            variant="primary"
            leadingIcon={<Download size={14} />}
            onClick={() => autonomousActions.importLegacy()}
          >
            Import prompt
          </Button>
        </div>
      </header>

      {error ? (
        <Card tone="accent" title="Autonomous error">
          <Text>{error}</Text>
        </Card>
      ) : null}

      <section className={styles.grid}>
        <Card
          title="Launch options"
          description="Dry-run безопасен и не требует внешних CLI/API."
          actions={<Rocket size={18} />}
        >
          <div className={styles.options}>
            <Select
              label="Engine"
              value={engineId}
              options={state.engines.map((engine) => ({ value: engine.id, label: engine.label }))}
              onValueChange={(value) => setEngineId(value as AutonomousEngineId)}
            />
            <Switch label="Dry run" checked={dryRun} onChange={(event) => setDryRun(event.currentTarget.checked)} />
            <TextArea
              label="Extra prompt"
              value={extraPrompt}
              onChange={(event) => setExtraPrompt(event.target.value)}
              rows={4}
            />
          </div>
        </Card>

        <Card title="Storage" description={state.storageRoot} actions={<Database size={18} />}>
          <Text variant="caption">
            Sessions пишутся в `.aist-agent/autonomous/sessions` как `meta.json`, `events.jsonl` и state files.
          </Text>
        </Card>
      </section>

      <section className={styles.columns}>
        <DefinitionList
          title="Flows"
          items={state.definitions.flows}
          onStart={(flow) => autonomousActions.startFlow(flow.id, launch)}
        />
        <RunList items={state.definitions.runs} onStart={(run) => autonomousActions.startRun(run.id, launch)} />
      </section>

      <Card title="Sessions" description="Последние native autonomous sessions.">
        <div className={styles.sessions}>
          {state.sessions.length ? (
            state.sessions.map((session) => (
              <article key={session.meta.id} className={styles.sessionCard}>
                <div>
                  <div className={styles.row}>
                    <strong>{session.meta.targetId || session.meta.id}</strong>
                    <Badge tone={getStatusTone(session.meta.status)}>{session.meta.status}</Badge>
                  </div>
                  <Text variant="caption">
                    {session.meta.kind} · {session.meta.engineId} · {session.events.length} events
                  </Text>
                </div>
                <div className={styles.actions}>
                  {session.meta.status === 'running' ? (
                    <Button
                      size="sm"
                      variant="danger"
                      leadingIcon={<Square size={13} />}
                      onClick={() => autonomousActions.stopSession(session.meta.id)}
                    >
                      Stop
                    </Button>
                  ) : null}
                  <Button size="sm" onClick={() => autonomousActions.exportSession(session.meta.id, 'markdown')}>
                    Export
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => autonomousActions.revealSession(session.meta.id)}>
                    Reveal
                  </Button>
                </div>
                <CodeBlock
                  label="Event tail"
                  compact
                  value={session.events
                    .slice(-5)
                    .map((event) => `${event.ts} ${event.action}: ${event.message}`)
                    .join('\n')}
                />
              </article>
            ))
          ) : (
            <EmptyState
              icon={<Rocket size={24} />}
              title="Sessions пока нет"
              description="Запустите flow или run в dry-run, чтобы проверить discovery и orchestration без внешних CLI/API."
            />
          )}
        </div>
      </Card>
    </main>
  );
}

function DefinitionList({
  title,
  items,
  onStart
}: {
  title: string;
  items: AutonomousFlowDefinition[];
  onStart(item: AutonomousFlowDefinition): void;
}) {
  return (
    <Card title={title} description={`${items.length} definitions`}>
      <div className={styles.list}>
        {items.map((flow) => (
          <article key={flow.id} className={styles.definition}>
            <div className={styles.row}>
              <strong>{flow.title}</strong>
              <Badge tone={flow.sourceKind === 'legacy' ? 'warning' : 'success'}>{flow.sourceKind}</Badge>
            </div>
            <Text variant="caption">{flow.description || flow.id}</Text>
            <Text variant="caption">
              {flow.stages.length} stages · {flow.defaultModel || 'default model'}
            </Text>
            <PipelineSteps steps={flow.stages.map((stage) => ({ id: stage.file, title: stage.title }))} />
            <Button size="sm" leadingIcon={<Play size={13} />} onClick={() => onStart(flow)}>
              Start
            </Button>
          </article>
        ))}
      </div>
    </Card>
  );
}

function RunList({
  items,
  onStart
}: {
  items: AutonomousRunDefinition[];
  onStart(item: AutonomousRunDefinition): void;
}) {
  return (
    <Card title="Runs" description={`${items.length} packages`}>
      <div className={styles.list}>
        {items.map((run) => (
          <article key={run.id} className={styles.definition}>
            <div className={styles.row}>
              <strong>{run.title}</strong>
              <Badge tone={run.sourceKind === 'legacy' ? 'warning' : 'success'}>{run.sourceKind}</Badge>
            </div>
            <Text variant="caption">
              {run.tasks.length} tasks · repeat {run.repeat}
            </Text>
            <Text variant="caption">{run.workDir || 'dir missing'}</Text>
            <Button size="sm" leadingIcon={<Play size={13} />} onClick={() => onStart(run)}>
              Start
            </Button>
          </article>
        ))}
      </div>
    </Card>
  );
}

function getStatusTone(status: string): 'neutral' | 'accent' | 'success' | 'warning' | 'danger' {
  if (status === 'finished') {
    return 'success';
  }
  if (status === 'running') {
    return 'accent';
  }
  if (status === 'stopped') {
    return 'warning';
  }
  if (status === 'error') {
    return 'danger';
  }
  return 'neutral';
}
