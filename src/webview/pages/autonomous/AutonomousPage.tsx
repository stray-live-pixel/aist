import {
  ArrowLeft,
  Database,
  Download,
  GitBranch,
  Play,
  Plus,
  RefreshCw,
  Rocket,
  Save,
  Square,
  Trash2
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { autonomousActions } from '../../shared/lib/autonomousActions';
import type {
  AutonomousEngineId,
  AutonomousFlowDefinition,
  AutonomousRunDefinition,
  AutonomousState,
  EditableAutonomousFlowDefinition,
  EditableAutonomousStageDefinition
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
  TextArea,
  TextField
} from '../../shared/ui';
import styles from './AutonomousPage.module.scss';

export type AutonomousPageProps = {
  state: AutonomousState;
  error?: string | null;
};

type AutonomousRoute = { page: 'dashboard' } | { page: 'flows' } | { page: 'flow-edit'; flowId: string };

type LaunchDraft = {
  engineId: AutonomousEngineId;
  dryRun: boolean;
  extraPrompt?: string;
};

/**
 * Корневая страница autonomous runner.
 *
 * Навигация остаётся локальной для webview, потому что сейчас это lightweight
 * dashboard без глубоких ссылок VS Code. Flow list вынесен на отдельную страницу,
 * чтобы главный экран не смешивал мониторинг запусков и редактирование definitions.
 */
export function AutonomousPage({ state, error }: AutonomousPageProps) {
  const [route, setRoute] = useState<AutonomousRoute>({ page: 'dashboard' });
  const [engineId, setEngineId] = useState<AutonomousEngineId>('dry-run');
  const [dryRun, setDryRun] = useState(true);
  const [extraPrompt, setExtraPrompt] = useState('');
  const legacyCount = useMemo(
    () =>
      [...state.definitions.flows, ...state.definitions.runs].filter((definition) => definition.sourceKind === 'legacy')
        .length,
    [state.definitions.flows, state.definitions.runs]
  );
  const launch: LaunchDraft = { engineId, dryRun, extraPrompt: extraPrompt.trim() || undefined };

  if (route.page === 'flows') {
    return (
      <FlowsPage
        state={state}
        onBack={() => setRoute({ page: 'dashboard' })}
        onOpenFlow={(flowId) => setRoute({ page: 'flow-edit', flowId })}
      />
    );
  }

  if (route.page === 'flow-edit') {
    const flow = state.definitions.flows.find((candidate) => candidate.id === route.flowId);
    return (
      <FlowEditorPage
        flow={flow}
        launch={launch}
        onBack={() => setRoute({ page: 'flows' })}
        onStart={(flowToStart) => autonomousActions.startFlow(flowToStart.id, launch)}
      />
    );
  }

  return (
    <main className={styles.page}>
      <AutonomousHeader
        state={state}
        legacyCount={legacyCount}
        actions={
          <>
            <Button size="sm" leadingIcon={<GitBranch size={14} />} onClick={() => setRoute({ page: 'flows' })}>
              Flows
            </Button>
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
          </>
        }
      />

      {error ? (
        <Card tone="accent" title="Autonomous error">
          <Text>{error}</Text>
        </Card>
      ) : null}

      <section className={styles.grid}>
        <LaunchOptionsCard
          state={state}
          engineId={engineId}
          dryRun={dryRun}
          extraPrompt={extraPrompt}
          onEngineChange={setEngineId}
          onDryRunChange={setDryRun}
          onExtraPromptChange={setExtraPrompt}
        />

        <Card title="Storage" description={state.storageRoot} actions={<Database size={18} />}>
          <Text variant="caption">
            Sessions пишутся в `.aist-agent/autonomous/sessions` как `meta.json`, `events.jsonl` и state files.
          </Text>
        </Card>
      </section>

      <section className={styles.singleColumn}>
        <RunList items={state.definitions.runs} onStart={(run) => autonomousActions.startRun(run.id, launch)} />
      </section>

      <SessionsCard state={state} />
    </main>
  );
}

function FlowsPage({
  state,
  onBack,
  onOpenFlow
}: {
  state: AutonomousState;
  onBack(): void;
  onOpenFlow(flowId: string): void;
}) {
  const [newFlowId, setNewFlowId] = useState('');
  const [newFlowTitle, setNewFlowTitle] = useState('');
  const normalizedNewFlowId = newFlowId.trim();
  const canCreateFlow = Boolean(normalizedNewFlowId);
  const createFlow = () => {
    if (!canCreateFlow) {
      return;
    }
    autonomousActions.createFlow({ id: normalizedNewFlowId, title: newFlowTitle.trim() || undefined });
    setNewFlowId('');
    setNewFlowTitle('');
  };
  const deleteFlow = (flow: AutonomousFlowDefinition) => {
    // Подтверждение выполняет extension через нативный VS Code modal: browser confirm
    // в webview ненадёжен и в некоторых окружениях просто не показывает диалог.
    autonomousActions.deleteFlow(flow.id);
  };

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <Text variant="caption">{state.workspaceName}</Text>
          <h1 className={styles.title}>Flows</h1>
          <Text variant="caption">Definitions из `.aist-agent/autonomous/flows`. Клик по flow открывает редактор.</Text>
        </div>
        <div className={styles.heroActions}>
          <Button size="sm" leadingIcon={<ArrowLeft size={14} />} onClick={onBack}>
            Back
          </Button>
          <Button size="sm" leadingIcon={<RefreshCw size={14} />} onClick={() => autonomousActions.refresh()}>
            Refresh
          </Button>
          <Button
            size="sm"
            variant="primary"
            leadingIcon={<Plus size={14} />}
            onClick={createFlow}
            disabled={!canCreateFlow}
          >
            Create flow
          </Button>
        </div>
      </header>

      <Card
        title="New flow"
        description="Для создания flow достаточно указать id; title можно заполнить сразу или позже в редакторе."
      >
        <div className={styles.createFlowForm}>
          <TextField
            label="Flow id"
            value={newFlowId}
            placeholder="my-flow"
            onChange={(event) => setNewFlowId(event.target.value)}
          />
          <TextField
            label="Title"
            value={newFlowTitle}
            placeholder="My flow"
            onChange={(event) => setNewFlowTitle(event.target.value)}
          />
          <Button variant="primary" leadingIcon={<Plus size={14} />} onClick={createFlow} disabled={!canCreateFlow}>
            Create flow
          </Button>
        </div>
      </Card>

      <Card title="Flow list" description={`${state.definitions.flows.length} definitions`}>
        {state.definitions.flows.length ? (
          <div className={styles.flowList}>
            {state.definitions.flows.map((flow) => (
              <article key={flow.id} className={styles.flowItem}>
                <span className={styles.flowItemHeader}>
                  <strong>{flow.title}</strong>
                  <Badge tone={flow.sourceKind === 'legacy' ? 'warning' : 'success'}>{flow.sourceKind}</Badge>
                </span>
                <Text variant="caption">{flow.description || flow.id}</Text>
                <span className={styles.flowMeta}>
                  {flow.stages.length} stages · {flow.defaultModel || 'default model'}
                </span>
                <span className={styles.flowItemActions}>
                  <Button size="sm" onClick={() => onOpenFlow(flow.id)}>
                    Open
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    leadingIcon={<Trash2 size={13} />}
                    onClick={() => deleteFlow(flow)}
                  >
                    Delete
                  </Button>
                </span>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<GitBranch size={24} />}
            title="Flow definitions не найдены"
            description="Добавьте `.aist-agent/autonomous/flows/<flowId>/.index.md` или импортируйте legacy prompt definitions."
            actions={
              <Button
                size="sm"
                variant="primary"
                leadingIcon={<Download size={14} />}
                onClick={() => autonomousActions.importLegacy()}
              >
                Import prompt
              </Button>
            }
          />
        )}
      </Card>
    </main>
  );
}

function FlowEditorPage({
  flow,
  launch,
  onBack,
  onStart
}: {
  flow: AutonomousFlowDefinition | undefined;
  launch: LaunchDraft;
  onBack(): void;
  onStart(flow: AutonomousFlowDefinition): void;
}) {
  const [draft, setDraft] = useState<EditableAutonomousFlowDefinition | undefined>(() =>
    flow ? toEditableFlow(flow) : undefined
  );
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle');

  useEffect(() => {
    setDraft(flow ? toEditableFlow(flow) : undefined);
    setSaveState('idle');
  }, [flow]);

  if (!flow || !draft) {
    return (
      <main className={styles.page}>
        <Button size="sm" leadingIcon={<ArrowLeft size={14} />} onClick={onBack}>
          Back to flows
        </Button>
        <EmptyState icon={<GitBranch size={24} />} title="Flow не найден" description="Обновите список definitions." />
      </main>
    );
  }

  const updateDraft = (patch: Partial<EditableAutonomousFlowDefinition>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
    setSaveState('idle');
  };
  const updateStage = (stageIndex: number, patch: Partial<EditableAutonomousStageDefinition>) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            stages: current.stages.map((stage, index) => (index === stageIndex ? { ...stage, ...patch } : stage))
          }
        : current
    );
    setSaveState('idle');
  };
  const saveDraft = () => {
    autonomousActions.saveFlow(draft);
    setSaveState('saved');
  };

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <Text variant="caption">Flow editor</Text>
          <h1 className={styles.title}>{draft.title || draft.id}</h1>
          <Text variant="caption">{flow.sourcePath}</Text>
        </div>
        <div className={styles.heroActions}>
          {saveState === 'saved' ? <Badge tone="success">Saved</Badge> : null}
          <Button size="sm" leadingIcon={<ArrowLeft size={14} />} onClick={onBack}>
            Back
          </Button>
          <Button size="sm" leadingIcon={<Save size={14} />} onClick={saveDraft}>
            Save
          </Button>
          <Button size="sm" variant="primary" leadingIcon={<Play size={14} />} onClick={() => onStart(flow)}>
            Start {launch.dryRun ? 'dry-run' : 'flow'}
          </Button>
        </div>
      </header>

      <section className={styles.grid}>
        <Card
          title="Metadata"
          description="Изменения сохраняются в `.aist-agent/autonomous/flows/<flowId>` через extension IPC."
        >
          <div className={styles.options}>
            <TextField label="ID" value={draft.id} readOnly />
            <TextField
              label="Title"
              value={draft.title}
              onChange={(event) => updateDraft({ title: event.target.value })}
            />
            <TextArea
              label="Description"
              value={draft.description}
              onChange={(event) => updateDraft({ description: event.target.value })}
              rows={5}
            />
            <TextArea
              label="Flow body"
              value={draft.body}
              onChange={(event) => updateDraft({ body: event.target.value })}
              rows={7}
            />
            <TextField
              label="Default model"
              value={draft.defaultModel || ''}
              onChange={(event) => updateDraft({ defaultModel: emptyToUndefined(event.target.value) })}
            />
            <TextField
              label="Default Codex model"
              value={draft.defaultCodexModel || ''}
              onChange={(event) => updateDraft({ defaultCodexModel: emptyToUndefined(event.target.value) })}
            />
          </div>
        </Card>

        <Card title="Pipeline" description={`${draft.stages.length} stages`}>
          <PipelineSteps steps={draft.stages.map((stage) => ({ id: stage.file, title: stage.title }))} />
          <TextArea
            label="Default summary rules"
            value={draft.defaultSummaryRules || ''}
            onChange={(event) => updateDraft({ defaultSummaryRules: emptyToUndefined(event.target.value) })}
            rows={8}
          />
        </Card>
      </section>

      <Card
        title="Stages"
        description="Редактируйте stage frontmatter и markdown body. Contexts задаются JSON-массивом."
      >
        <div className={styles.stageList}>
          {draft.stages.map((stage, index) => (
            <StageEditorCard
              key={stage.file}
              stage={stage}
              index={index}
              onChange={(patch) => updateStage(index, patch)}
            />
          ))}
        </div>
      </Card>
    </main>
  );
}

function StageEditorCard({
  stage,
  index,
  onChange
}: {
  stage: EditableAutonomousStageDefinition;
  index: number;
  onChange(patch: Partial<EditableAutonomousStageDefinition>): void;
}) {
  const [contextsText, setContextsText] = useState(() => JSON.stringify(stage.contexts, null, 2));
  const [contextsError, setContextsError] = useState<string | undefined>();

  useEffect(() => {
    setContextsText(JSON.stringify(stage.contexts, null, 2));
    setContextsError(undefined);
  }, [stage.contexts]);

  return (
    <article className={styles.stageCard}>
      <div className={styles.row}>
        <strong>
          {index + 1}. {stage.title || stage.file}
        </strong>
        <Badge tone="neutral">{stage.file}</Badge>
      </div>
      <div className={styles.stageMeta}>
        <Text variant="caption">model: {stage.model || 'flow default'}</Text>
        <Text variant="caption">codex_model: {stage.codexModel || 'flow/default'}</Text>
        <Text variant="caption">contexts: {stage.contexts.length || 'standalone'}</Text>
      </div>
      <TextField label="Stage file" value={stage.file} readOnly />
      <TextField label="Title" value={stage.title} onChange={(event) => onChange({ title: event.target.value })} />
      <TextField
        label="Model"
        value={stage.model || ''}
        onChange={(event) => onChange({ model: emptyToUndefined(event.target.value) })}
      />
      <TextField
        label="Codex model"
        value={stage.codexModel || ''}
        onChange={(event) => onChange({ codexModel: emptyToUndefined(event.target.value) })}
      />
      <TextArea
        label="Contexts JSON"
        value={contextsText}
        onChange={(event) => {
          const nextValue = event.target.value;
          setContextsText(nextValue);
          try {
            const parsed = JSON.parse(nextValue) as EditableAutonomousStageDefinition['contexts'];
            if (!Array.isArray(parsed)) {
              throw new Error('Contexts must be an array.');
            }
            setContextsError(undefined);
            onChange({ contexts: parsed });
          } catch (error) {
            setContextsError(error instanceof Error ? error.message : String(error));
          }
        }}
        rows={5}
      />
      {contextsError ? <Text variant="danger">{contextsError}</Text> : null}
      <TextArea
        label="Summary rules"
        value={stage.summaryRules || ''}
        onChange={(event) => onChange({ summaryRules: emptyToUndefined(event.target.value) })}
        rows={5}
      />
      <TextArea
        label="Body"
        value={stage.body}
        onChange={(event) => onChange({ body: event.target.value })}
        rows={10}
      />
    </article>
  );
}

function toEditableFlow(flow: AutonomousFlowDefinition): EditableAutonomousFlowDefinition {
  return {
    id: flow.id,
    title: flow.title,
    description: flow.description,
    body: flow.body,
    defaultModel: flow.defaultModel,
    defaultCodexModel: flow.defaultCodexModel,
    defaultSummaryRules: flow.defaultSummaryRules,
    stages: flow.stages.map((stage) => ({
      file: stage.file,
      title: stage.title,
      body: stage.body,
      model: stage.model,
      codexModel: stage.codexModel,
      contexts: stage.contexts,
      summaryRules: stage.summaryRules
    }))
  };
}

function emptyToUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function AutonomousHeader({
  state,
  legacyCount,
  actions
}: {
  state: AutonomousState;
  legacyCount: number;
  actions: React.ReactNode;
}) {
  return (
    <header className={styles.hero}>
      <div>
        <Text variant="caption">{state.workspaceName}</Text>
        <h1 className={styles.title}>Autonomous Runner</h1>
        <Text variant="caption">Нативные flow/run definitions из `.aist-agent/autonomous`.</Text>
      </div>
      <div className={styles.heroActions}>
        <Badge tone={legacyCount ? 'warning' : 'success'}>{legacyCount} legacy</Badge>
        {actions}
      </div>
    </header>
  );
}

function LaunchOptionsCard({
  state,
  engineId,
  dryRun,
  extraPrompt,
  onEngineChange,
  onDryRunChange,
  onExtraPromptChange
}: {
  state: AutonomousState;
  engineId: AutonomousEngineId;
  dryRun: boolean;
  extraPrompt: string;
  onEngineChange(engineId: AutonomousEngineId): void;
  onDryRunChange(dryRun: boolean): void;
  onExtraPromptChange(extraPrompt: string): void;
}) {
  return (
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
          onValueChange={(value) => onEngineChange(value as AutonomousEngineId)}
        />
        <Switch label="Dry run" checked={dryRun} onChange={(event) => onDryRunChange(event.currentTarget.checked)} />
        <TextArea
          label="Extra prompt"
          value={extraPrompt}
          onChange={(event) => onExtraPromptChange(event.target.value)}
          rows={4}
        />
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

function SessionsCard({ state }: { state: AutonomousState }) {
  return (
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
            description="Запустите run или flow в dry-run, чтобы проверить discovery и orchestration без внешних CLI/API."
          />
        )}
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
