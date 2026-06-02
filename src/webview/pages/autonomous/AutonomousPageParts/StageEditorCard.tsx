import { useEffect, useState } from 'react';

import { type EditableAutonomousStageDefinition } from '../../../shared/types';
import { Badge, Text, TextArea, TextField } from '../../../shared/ui';
import styles from '../AutonomousPage.module.scss';
import { emptyToUndefined } from './emptyToUndefined';

export function StageEditorCard({
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
