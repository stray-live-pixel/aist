import { ArrowDown, ArrowUp, Link2, Plus, Trash2 } from 'lucide-react';

import { useI18n } from '../../../i18n';
import { type EditableAutonomousStageDefinition } from '../../../types';
import { Badge, Button, CollapsibleSection, Select, Text, TextArea, TextField } from '../../../ui';
import styles from '../AutonomousPage.module.scss';
import { emptyToUndefined } from './emptyToUndefined';

type StageContext = EditableAutonomousStageDefinition['contexts'][number];

export function StageEditorCard({
  stage,
  index,
  totalStages,
  fileError,
  onChange,
  onMoveUp,
  onMoveDown,
  onDelete
}: {
  stage: EditableAutonomousStageDefinition;
  index: number;
  totalStages: number;
  fileError?: string;
  onChange(patch: Partial<EditableAutonomousStageDefinition>): void;
  onMoveUp(): void;
  onMoveDown(): void;
  onDelete(): void;
}) {
  const { t } = useI18n();
  const contextOptions = [
    { value: 'continue', label: t('autonomous.workflow.context.mode.continue') },
    { value: 'continue-from', label: t('autonomous.workflow.context.mode.continueFrom') },
    { value: 'summary-from', label: t('autonomous.workflow.context.mode.summaryFrom') }
  ];

  function updateContext(contextIndex: number, patch: Partial<StageContext>) {
    onChange({
      contexts: stage.contexts.map((context, currentIndex) =>
        currentIndex === contextIndex ? normalizeContext({ ...context, ...patch }) : context
      )
    });
  }

  function addContext() {
    onChange({
      contexts: [
        ...stage.contexts,
        {
          mode: index > 0 ? 'summary-from' : 'continue',
          from: index > 0 ? index : undefined
        }
      ]
    });
  }

  function deleteContext(contextIndex: number) {
    onChange({ contexts: stage.contexts.filter((_, currentIndex) => currentIndex !== contextIndex) });
  }

  return (
    <CollapsibleSection
      title={stage.title || stage.file || t('autonomous.workflow.stage.untitled')}
      description={t('autonomous.workflow.stage.subtitle', { index: index + 1, file: stage.file })}
      icon={<Link2 size={14} />}
      meta={
        <Badge tone={fileError ? 'danger' : 'neutral'}>{stage.file || t('autonomous.workflow.stage.noFile')}</Badge>
      }
      actions={
        <div className={styles.stageActions}>
          <Button
            size="sm"
            variant="ghost"
            iconOnly
            title={t('autonomous.workflow.stage.moveUp')}
            aria-label={t('autonomous.workflow.stage.moveUp')}
            disabled={index === 0}
            onClick={onMoveUp}
          >
            <ArrowUp size={13} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            iconOnly
            title={t('autonomous.workflow.stage.moveDown')}
            aria-label={t('autonomous.workflow.stage.moveDown')}
            disabled={index >= totalStages - 1}
            onClick={onMoveDown}
          >
            <ArrowDown size={13} />
          </Button>
          <Button
            size="sm"
            variant="danger"
            iconOnly
            title={t('autonomous.workflow.stage.delete')}
            aria-label={t('autonomous.workflow.stage.delete')}
            disabled={totalStages <= 1}
            onClick={onDelete}
          >
            <Trash2 size={13} />
          </Button>
        </div>
      }
      collapsedPreview={stage.body ? stage.body.slice(0, 180) : t('autonomous.workflow.stage.emptyPrompt')}
    >
      <div className={styles.stageFormGrid}>
        <TextField
          label={t('autonomous.workflow.stage.file')}
          value={stage.file}
          error={fileError}
          placeholder="1-plan.md"
          onChange={(event) => onChange({ file: event.target.value })}
        />
        <TextField
          label={t('autonomous.workflow.stage.title')}
          value={stage.title}
          placeholder={t('autonomous.workflow.stage.titlePlaceholder')}
          onChange={(event) => onChange({ title: event.target.value })}
        />
        <TextField
          label={t('autonomous.workflow.stage.model')}
          value={stage.model || ''}
          placeholder={t('autonomous.workflow.stage.flowDefault')}
          onChange={(event) => onChange({ model: emptyToUndefined(event.target.value) })}
        />
        <TextField
          label={t('autonomous.workflow.stage.codexModel')}
          value={stage.codexModel || ''}
          placeholder={t('autonomous.workflow.stage.flowDefault')}
          onChange={(event) => onChange({ codexModel: emptyToUndefined(event.target.value) })}
        />
      </div>

      <TextArea
        label={t('autonomous.workflow.stage.prompt')}
        hint={t('autonomous.workflow.stage.promptHint')}
        value={stage.body}
        onChange={(event) => onChange({ body: event.target.value })}
        rows={12}
      />

      <TextArea
        label={t('autonomous.workflow.stage.summaryRules')}
        hint={t('autonomous.workflow.stage.summaryRulesHint')}
        value={stage.summaryRules || ''}
        onChange={(event) => onChange({ summaryRules: emptyToUndefined(event.target.value) })}
        rows={5}
      />

      <CollapsibleSection
        title={t('autonomous.workflow.context.title')}
        description={t('autonomous.workflow.context.description')}
        icon={<Link2 size={14} />}
        meta={<Badge>{t('autonomous.workflow.context.count', { count: stage.contexts.length })}</Badge>}
        actions={
          <Button size="sm" leadingIcon={<Plus size={13} />} onClick={addContext}>
            {t('autonomous.workflow.context.add')}
          </Button>
        }
        collapsedPreview={
          stage.contexts.length
            ? stage.contexts.map((context) => formatContextPreview(context, t)).join(' · ')
            : t('autonomous.workflow.context.none')
        }
      >
        <div className={styles.contextList}>
          {stage.contexts.length ? (
            stage.contexts.map((context, contextIndex) => (
              <CollapsibleSection
                key={`${context.mode}-${contextIndex}`}
                tone="subtle"
                title={t('autonomous.workflow.context.itemTitle', { index: contextIndex + 1 })}
                description={formatContextPreview(context, t)}
                meta={<Badge>{t(`autonomous.workflow.context.mode.${context.mode}` as never)}</Badge>}
                actions={
                  <Button
                    size="sm"
                    variant="danger"
                    iconOnly
                    title={t('autonomous.workflow.context.delete')}
                    aria-label={t('autonomous.workflow.context.delete')}
                    onClick={() => deleteContext(contextIndex)}
                  >
                    <Trash2 size={13} />
                  </Button>
                }
              >
                <div className={styles.contextGrid}>
                  <Select
                    size="sm"
                    label={t('autonomous.workflow.context.mode')}
                    value={context.mode}
                    options={contextOptions}
                    searchable={false}
                    onValueChange={(mode) => updateContext(contextIndex, { mode: mode as StageContext['mode'] })}
                  />
                  <TextField
                    label={t('autonomous.workflow.context.from')}
                    type="number"
                    min={1}
                    disabled={context.mode === 'continue'}
                    value={context.from ? String(context.from) : ''}
                    placeholder={context.mode === 'continue' ? t('common.notAvailable') : '1'}
                    onChange={(event) =>
                      updateContext(contextIndex, {
                        from: event.target.value ? Number(event.target.value) : undefined
                      })
                    }
                  />
                </div>
                <TextArea
                  label={t('autonomous.workflow.context.summaryRules')}
                  value={context.summaryRules || ''}
                  disabled={context.mode !== 'summary-from'}
                  onChange={(event) =>
                    updateContext(contextIndex, { summaryRules: emptyToUndefined(event.target.value) })
                  }
                  rows={4}
                />
              </CollapsibleSection>
            ))
          ) : (
            <Text variant="caption">{t('autonomous.workflow.context.empty')}</Text>
          )}
        </div>
      </CollapsibleSection>
    </CollapsibleSection>
  );
}

function normalizeContext(context: StageContext): StageContext {
  if (context.mode === 'continue') {
    return { mode: 'continue' };
  }
  return context;
}

function formatContextPreview(context: StageContext, t: ReturnType<typeof useI18n>['t']): string {
  if (context.mode === 'continue') {
    return t('autonomous.workflow.context.preview.continue');
  }
  if (context.mode === 'continue-from') {
    return t('autonomous.workflow.context.preview.continueFrom', { from: context.from || '?' });
  }
  return t('autonomous.workflow.context.preview.summaryFrom', { from: context.from || '?' });
}
