import { AlertTriangle, ArrowLeft, GitBranch, Layers3, Plus, Save, Settings } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { useI18n } from '../../../i18n';
import { autonomousActions } from '../../../lib/autonomousActions';
import {
  type AutonomousFlowDefinition,
  type EditableAutonomousFlowDefinition,
  type EditableAutonomousStageDefinition
} from '../../../types';
import {
  Badge,
  Button,
  Callout,
  Card,
  EmptyState,
  InfoTile,
  KeyValueGrid,
  PipelineSteps,
  Text,
  TextArea,
  TextField
} from '../../../ui';
import type { KeyValueItem, PipelineStep } from '../../../ui';
import styles from '../AutonomousPage.module.scss';
import { StageEditorCard } from './StageEditorCard';
import { emptyToUndefined } from './emptyToUndefined';
import { toEditableFlow } from './toEditableFlow';

export function FlowEditorPage({
  flow,
  error,
  onBack
}: {
  flow: AutonomousFlowDefinition | undefined;
  error?: string | null;
  onBack(): void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<EditableAutonomousFlowDefinition | undefined>(() =>
    flow ? toEditableFlow(flow) : undefined
  );
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle');

  useEffect(() => {
    setDraft(flow ? toEditableFlow(flow) : undefined);
    setSaveState('idle');
  }, [flow]);

  const validationErrors = useMemo(() => (draft ? validateFlowDraft(draft, t) : []), [draft, t]);
  const stageFileErrors = useMemo(() => (draft ? getStageFileErrors(draft, t) : new Map<string, string>()), [draft, t]);
  const canSave = draft ? validationErrors.length === 0 : false;

  if (!flow || !draft) {
    return (
      <main className={styles.page}>
        <Button size="sm" leadingIcon={<ArrowLeft size={14} />} onClick={onBack}>
          {t('autonomous.workflow.backToWorkflows')}
        </Button>
        <EmptyState
          icon={<GitBranch size={24} />}
          title={t('autonomous.workflow.notFoundTitle')}
          description={t('autonomous.workflow.notFoundDescription')}
        />
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
  const addStage = () => {
    setDraft((current) => {
      if (!current) return current;
      const nextIndex = current.stages.length + 1;
      const title = t('autonomous.workflow.stage.newTitle', { index: nextIndex });
      return {
        ...current,
        stages: [
          ...current.stages,
          {
            file: createStageFileName(current.stages, nextIndex, title),
            title,
            body: createStagePrompt(title, t),
            contexts: nextIndex > 1 ? [{ mode: 'summary-from', from: nextIndex - 1 }] : []
          }
        ]
      };
    });
    setSaveState('idle');
  };
  const deleteStage = (stageIndex: number) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            stages: current.stages.filter((_, index) => index !== stageIndex)
          }
        : current
    );
    setSaveState('idle');
  };
  const moveStage = (stageIndex: number, direction: -1 | 1) => {
    setDraft((current) => {
      if (!current) return current;
      const targetIndex = stageIndex + direction;
      if (targetIndex < 0 || targetIndex >= current.stages.length) return current;
      const stages = [...current.stages];
      const [stage] = stages.splice(stageIndex, 1);
      if (!stage) return current;
      stages.splice(targetIndex, 0, stage);
      return { ...current, stages };
    });
    setSaveState('idle');
  };
  const saveDraft = () => {
    if (!canSave) {
      setSaveState('idle');
      return;
    }
    autonomousActions.saveFlow(draft);
    setSaveState('saved');
  };
  const pipelineSteps: PipelineStep[] = draft.stages.map((stage, index) => ({
    id: `${stage.file}-${index}`,
    title: `${index + 1}. ${stage.title || stage.file}`,
    status: stageFileErrors.has(stage.file) ? 'error' : 'pending',
    statusLabel: stageFileErrors.has(stage.file)
      ? t('autonomous.workflow.pipeline.invalid')
      : t('autonomous.workflow.pipeline.ready')
  }));

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroText}>
          <Text variant="caption">{t('autonomous.workflow.editorEyebrow')}</Text>
          <Text variant="display" as="h1">
            {draft.title || draft.id}
          </Text>
          <Text variant="caption">{flow.sourcePath}</Text>
        </div>
        <div className={styles.heroActions}>
          {saveState === 'saved' ? <Badge tone="success">{t('autonomous.workflow.saved')}</Badge> : null}
          <Button size="sm" leadingIcon={<ArrowLeft size={14} />} onClick={onBack}>
            {t('autonomous.workflow.back')}
          </Button>
          <Button size="sm" leadingIcon={<Save size={14} />} onClick={saveDraft} disabled={!canSave}>
            {t('common.save')}
          </Button>
        </div>
      </header>

      {error ? (
        <Callout tone="danger" icon={<AlertTriangle size={15} />} title={t('autonomous.workflows.errorTitle')}>
          {error}
        </Callout>
      ) : null}

      {flow.sourceKind === 'legacy' ? (
        <Callout tone="warning" icon={<AlertTriangle size={15} />} title={t('autonomous.workflow.legacyTitle')}>
          {t('autonomous.workflow.legacyDescription')}
        </Callout>
      ) : null}

      {validationErrors.length ? (
        <Callout tone="danger" icon={<AlertTriangle size={15} />} title={t('autonomous.workflow.validationTitle')}>
          <ul className={styles.validationList}>
            {validationErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </Callout>
      ) : null}

      <div className={styles.tileGrid}>
        <InfoTile
          icon={<Layers3 size={14} />}
          title={t('autonomous.workflow.summary.steps')}
          value={String(draft.stages.length)}
          description={t('autonomous.workflow.summary.stepsDescription')}
        />
        <InfoTile
          icon={<Settings size={14} />}
          title={t('autonomous.workflow.summary.defaultModel')}
          value={draft.defaultModel || t('autonomous.workflow.summary.providerDefault')}
          description={draft.defaultCodexModel || t('autonomous.workflow.summary.noCodexOverride')}
        />
        <InfoTile
          icon={<GitBranch size={14} />}
          tone={flow.sourceKind === 'legacy' ? 'warning' : 'success'}
          title={t('autonomous.workflow.summary.source')}
          value={flow.sourceKind}
          description={draft.id}
        />
      </div>

      <section className={styles.editorGrid}>
        <Card
          title={t('autonomous.workflow.metadata.title')}
          description={t('autonomous.workflow.metadata.description')}
        >
          <div className={styles.options}>
            <TextField label={t('autonomous.workflow.metadata.id')} value={draft.id} readOnly />
            <TextField
              label={t('autonomous.workflow.metadata.name')}
              value={draft.title}
              onChange={(event) => updateDraft({ title: event.target.value })}
            />
            <TextArea
              label={t('autonomous.workflow.metadata.descriptionLabel')}
              value={draft.description}
              onChange={(event) => updateDraft({ description: event.target.value })}
              rows={5}
            />
            <TextArea
              label={t('autonomous.workflow.metadata.body')}
              hint={t('autonomous.workflow.metadata.bodyHint')}
              value={draft.body}
              onChange={(event) => updateDraft({ body: event.target.value })}
              rows={7}
            />
          </div>
        </Card>

        <Card
          title={t('autonomous.workflow.defaults.title')}
          description={t('autonomous.workflow.defaults.description')}
        >
          <div className={styles.options}>
            <TextField
              label={t('autonomous.workflow.defaults.model')}
              value={draft.defaultModel || ''}
              placeholder={t('autonomous.workflow.defaults.providerDefault')}
              onChange={(event) => updateDraft({ defaultModel: emptyToUndefined(event.target.value) })}
            />
            <TextField
              label={t('autonomous.workflow.defaults.codexModel')}
              value={draft.defaultCodexModel || ''}
              placeholder={t('autonomous.workflow.defaults.providerDefault')}
              onChange={(event) => updateDraft({ defaultCodexModel: emptyToUndefined(event.target.value) })}
            />
            <TextArea
              label={t('autonomous.workflow.defaults.summaryRules')}
              hint={t('autonomous.workflow.defaults.summaryRulesHint')}
              value={draft.defaultSummaryRules || ''}
              onChange={(event) => updateDraft({ defaultSummaryRules: emptyToUndefined(event.target.value) })}
              rows={8}
            />
          </div>
        </Card>
      </section>

      <Card
        title={t('autonomous.workflow.pipeline.title')}
        description={t('autonomous.workflow.pipeline.description')}
        actions={
          <Button size="sm" leadingIcon={<Plus size={14} />} onClick={addStage}>
            {t('autonomous.workflow.stage.add')}
          </Button>
        }
      >
        <div className={styles.stageEditorList}>
          <PipelineSteps steps={pipelineSteps} />
          <KeyValueGrid items={getFlowFacts(draft, flow, t)} />
          {draft.stages.map((stage, index) => (
            <StageEditorCard
              key={`${stage.file}-${index}`}
              stage={stage}
              index={index}
              totalStages={draft.stages.length}
              fileError={stageFileErrors.get(stage.file)}
              onChange={(patch) => updateStage(index, patch)}
              onMoveUp={() => moveStage(index, -1)}
              onMoveDown={() => moveStage(index, 1)}
              onDelete={() => deleteStage(index)}
            />
          ))}
        </div>
      </Card>
    </main>
  );
}

function getFlowFacts(
  draft: EditableAutonomousFlowDefinition,
  flow: AutonomousFlowDefinition,
  t: ReturnType<typeof useI18n>['t']
): KeyValueItem[] {
  return [
    { key: 'id', label: t('autonomous.workflow.fact.id'), value: draft.id, title: draft.id },
    {
      key: 'source',
      label: t('autonomous.workflow.fact.source'),
      value: flow.sourceKind,
      tone: flow.sourceKind === 'legacy' ? 'warning' : 'success'
    },
    {
      key: 'stages',
      label: t('autonomous.workflow.fact.stages'),
      value: String(draft.stages.length)
    }
  ];
}

function validateFlowDraft(draft: EditableAutonomousFlowDefinition, t: ReturnType<typeof useI18n>['t']): string[] {
  const errors: string[] = [];
  if (!draft.title.trim()) {
    errors.push(t('autonomous.workflow.validation.nameRequired'));
  }
  if (!draft.stages.length) {
    errors.push(t('autonomous.workflow.validation.stageRequired'));
  }
  getStageFileErrors(draft, t).forEach((error) => errors.push(error));
  return [...new Set(errors)];
}

function getStageFileErrors(
  draft: EditableAutonomousFlowDefinition,
  t: ReturnType<typeof useI18n>['t']
): Map<string, string> {
  const errors = new Map<string, string>();
  const counts = new Map<string, number>();
  for (const stage of draft.stages) {
    const file = stage.file.trim();
    counts.set(file, (counts.get(file) || 0) + 1);
    if (!isValidStageFile(file)) {
      errors.set(stage.file, t('autonomous.workflow.validation.stageFileInvalid', { file: stage.file || '?' }));
    }
  }
  for (const [file, count] of counts) {
    if (file && count > 1) {
      errors.set(file, t('autonomous.workflow.validation.stageFileDuplicate', { file }));
    }
  }
  return errors;
}

function isValidStageFile(file: string): boolean {
  return Boolean(file) && !file.startsWith('/') && !file.includes('..') && file.endsWith('.md');
}

function createStageFileName(
  stages: readonly EditableAutonomousStageDefinition[],
  index: number,
  title: string
): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  let candidate = `${String(index).padStart(2, '0')}-${slug || 'stage'}.md`;
  let suffix = 2;
  const existing = new Set(stages.map((stage) => stage.file));
  while (existing.has(candidate)) {
    candidate = `${String(index).padStart(2, '0')}-${slug || 'stage'}-${suffix}.md`;
    suffix += 1;
  }
  return candidate;
}

function createStagePrompt(title: string, t: ReturnType<typeof useI18n>['t']): string {
  return `# ${title}\n\n${t('autonomous.workflow.stage.newPrompt')}`;
}
