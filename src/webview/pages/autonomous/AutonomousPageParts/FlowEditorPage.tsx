import { ArrowLeft, GitBranch, Play, Save } from 'lucide-react';
import { useEffect, useState } from 'react';

import { autonomousActions } from '../../../shared/lib/autonomousActions';
import {
  type AutonomousFlowDefinition,
  type EditableAutonomousFlowDefinition,
  type EditableAutonomousStageDefinition
} from '../../../shared/types';
import { Badge, Button, Card, EmptyState, PipelineSteps, Text, TextArea, TextField } from '../../../shared/ui';
import styles from '../AutonomousPage.module.scss';
import { LaunchDraft } from './LaunchDraft';
import { StageEditorCard } from './StageEditorCard';
import { emptyToUndefined } from './emptyToUndefined';
import { toEditableFlow } from './toEditableFlow';

export function FlowEditorPage({
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
