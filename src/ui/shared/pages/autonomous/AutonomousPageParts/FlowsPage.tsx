import { Copy, Download, GitBranch, LoaderCircle, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useI18n } from '../../../i18n';
import { autonomousActions } from '../../../lib/autonomousActions';
import { type AutonomousFlowDefinition, type AutonomousState } from '../../../types';
import {
  Badge,
  Button,
  Callout,
  Card,
  CollapsibleSection,
  EmptyState,
  InfoTile,
  KeyValueGrid,
  Text,
  TextField
} from '../../../ui';
import type { KeyValueItem } from '../../../ui';
import styles from '../AutonomousPage.module.scss';
import { toEditableFlow } from './toEditableFlow';

export function FlowsPage({
  state,
  error,
  operation,
  onBack,
  onOpenFlow
}: {
  state: AutonomousState;
  error?: string | null;
  operation?: {
    operation: 'deleteFlow';
    flowId: string;
    status: 'done' | 'cancelled' | 'error';
  } | null;
  onBack?: () => void;
  onOpenFlow(flowId: string): void;
}) {
  const { t } = useI18n();
  const [newFlowId, setNewFlowId] = useState('');
  const [newFlowTitle, setNewFlowTitle] = useState('');
  const [deletingFlowId, setDeletingFlowId] = useState<string | undefined>();
  const previousFlowIdsRef = useRef<Set<string>>(new Set(state.definitions.flows.map((flow) => flow.id)));
  const normalizedNewFlowId = newFlowId.trim();
  const flowIds = useMemo(() => new Set(state.definitions.flows.map((flow) => flow.id)), [state.definitions.flows]);
  const newFlowIdError = getNewFlowIdError(normalizedNewFlowId, flowIds, t);
  const canCreateFlow = Boolean(normalizedNewFlowId) && !newFlowIdError;
  const nativeCount = state.definitions.flows.filter((flow) => flow.sourceKind === 'native').length;
  const legacyCount = state.definitions.flows.length - nativeCount;

  useEffect(() => {
    if (deletingFlowId && previousFlowIdsRef.current.has(deletingFlowId) && !flowIds.has(deletingFlowId)) {
      setDeletingFlowId(undefined);
    }
    previousFlowIdsRef.current = flowIds;
  }, [deletingFlowId, flowIds]);

  useEffect(() => {
    if (operation?.operation === 'deleteFlow' && operation.flowId === deletingFlowId) {
      setDeletingFlowId(undefined);
    }
  }, [deletingFlowId, operation]);

  const createFlow = () => {
    if (!canCreateFlow) {
      return;
    }
    autonomousActions.createFlow({ id: normalizedNewFlowId, title: newFlowTitle.trim() || undefined });
    onOpenFlow(normalizedNewFlowId);
    setNewFlowId('');
    setNewFlowTitle('');
  };
  const deleteFlow = (flow: AutonomousFlowDefinition) => {
    if (deletingFlowId || flow.sourceKind !== 'native') {
      return;
    }

    setDeletingFlowId(flow.id);
    autonomousActions.deleteFlow({ id: flow.id, sourcePath: flow.sourcePath });
  };
  const duplicateFlow = (flow: AutonomousFlowDefinition) => {
    const copyId = createCopyFlowId(flow.id, flowIds);
    autonomousActions.saveFlow({
      ...toEditableFlow(flow),
      id: copyId,
      title: t('autonomous.workflows.copyTitle', { title: flow.title })
    });
    onOpenFlow(copyId);
  };

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroText}>
          <Text variant="caption">{state.workspaceName}</Text>
          <Text variant="display" as="h1">
            {t('autonomous.workflows.title')}
          </Text>
          <Text variant="caption">{t('autonomous.workflows.description')}</Text>
        </div>
        <div className={styles.heroActions}>
          {onBack ? (
            <Button size="sm" onClick={onBack}>
              {t('autonomous.workflows.back')}
            </Button>
          ) : null}
          <Button size="sm" leadingIcon={<RefreshCw size={14} />} onClick={() => autonomousActions.refresh()}>
            {t('isolation.refresh')}
          </Button>
          <Button
            size="sm"
            variant="primary"
            leadingIcon={<Plus size={14} />}
            onClick={createFlow}
            disabled={!canCreateFlow}
          >
            {t('autonomous.workflows.create')}
          </Button>
        </div>
      </header>

      {error ? (
        <Callout tone="danger" title={t('autonomous.workflows.errorTitle')}>
          {error}
        </Callout>
      ) : null}

      <div className={styles.tileGrid}>
        <InfoTile
          icon={<GitBranch size={14} />}
          title={t('autonomous.workflows.summary.total')}
          value={String(state.definitions.flows.length)}
          description={t('autonomous.workflows.summary.totalDescription')}
        />
        <InfoTile
          tone="success"
          title={t('autonomous.workflows.summary.native')}
          value={String(nativeCount)}
          description={t('autonomous.workflows.summary.nativeDescription')}
        />
        <InfoTile
          tone={legacyCount ? 'warning' : 'neutral'}
          title={t('autonomous.workflows.summary.legacy')}
          value={String(legacyCount)}
          description={t('autonomous.workflows.summary.legacyDescription')}
        />
      </div>

      <Card title={t('autonomous.workflows.new.title')} description={t('autonomous.workflows.new.description')}>
        <div className={styles.createFlowForm}>
          <TextField
            label={t('autonomous.workflows.new.id')}
            value={newFlowId}
            error={newFlowIdError}
            placeholder="my-workflow"
            onChange={(event) => setNewFlowId(event.target.value)}
          />
          <TextField
            label={t('autonomous.workflows.new.name')}
            value={newFlowTitle}
            placeholder={t('autonomous.workflows.new.namePlaceholder')}
            onChange={(event) => setNewFlowTitle(event.target.value)}
          />
          <Button variant="primary" leadingIcon={<Plus size={14} />} onClick={createFlow} disabled={!canCreateFlow}>
            {t('autonomous.workflows.create')}
          </Button>
        </div>
      </Card>

      <Card
        title={t('autonomous.workflows.list.title')}
        description={t('autonomous.workflows.list.description', { count: state.definitions.flows.length })}
        actions={
          <Button size="sm" leadingIcon={<Download size={14} />} onClick={() => autonomousActions.importLegacy()}>
            {t('autonomous.workflows.import')}
          </Button>
        }
      >
        {state.definitions.flows.length ? (
          <div className={styles.workflowList}>
            {state.definitions.flows.map((flow) => {
              const deletingThisFlow = deletingFlowId === flow.id;
              const anyFlowDeleting = deletingFlowId !== undefined;

              return (
                <CollapsibleSection
                  key={flow.id}
                  title={flow.title}
                  description={flow.description || flow.id}
                  icon={<GitBranch size={14} />}
                  meta={<Badge tone={flow.sourceKind === 'legacy' ? 'warning' : 'success'}>{flow.sourceKind}</Badge>}
                  collapsedPreview={t('autonomous.workflows.list.preview', {
                    count: flow.stages.length,
                    model: flow.defaultModel || t('autonomous.workflow.summary.providerDefault')
                  })}
                  actions={
                    <div className={styles.workflowActions} aria-busy={deletingThisFlow}>
                      <Button
                        size="sm"
                        leadingIcon={<Pencil size={13} />}
                        disabled={anyFlowDeleting}
                        onClick={() => onOpenFlow(flow.id)}
                      >
                        {t('common.edit')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        leadingIcon={<Copy size={13} />}
                        disabled={anyFlowDeleting}
                        onClick={() => duplicateFlow(flow)}
                      >
                        {t('autonomous.workflows.duplicate')}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        leadingIcon={
                          deletingThisFlow ? (
                            <LoaderCircle className={styles.spinner} size={13} aria-hidden="true" />
                          ) : (
                            <Trash2 size={13} />
                          )
                        }
                        disabled={anyFlowDeleting || flow.sourceKind !== 'native'}
                        title={
                          deletingThisFlow
                            ? t('autonomous.workflows.deleting')
                            : flow.sourceKind === 'native'
                              ? t('autonomous.workflows.delete')
                              : t('autonomous.workflows.deleteLegacyDisabled')
                        }
                        onClick={() => deleteFlow(flow)}
                      >
                        {deletingThisFlow ? t('autonomous.workflows.deleting') : t('common.delete')}
                      </Button>
                    </div>
                  }
                >
                  <div className={styles.workflowDetails}>
                    <KeyValueGrid items={getFlowDetails(flow, t)} />
                    {flow.diagnostics.length ? (
                      <Callout tone="warning" title={t('autonomous.workflows.diagnostics')}>
                        {flow.diagnostics.map((diagnostic) => diagnostic.message).join('\n')}
                      </Callout>
                    ) : null}
                    <Text variant="caption">{flow.sourcePath}</Text>
                  </div>
                </CollapsibleSection>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<GitBranch size={24} />}
            title={t('autonomous.workflows.empty.title')}
            description={t('autonomous.workflows.empty.description')}
            actions={
              <Button
                size="sm"
                variant="primary"
                leadingIcon={<Download size={14} />}
                onClick={() => autonomousActions.importLegacy()}
              >
                {t('autonomous.workflows.import')}
              </Button>
            }
          />
        )}
      </Card>
    </main>
  );
}

function getFlowDetails(flow: AutonomousFlowDefinition, t: ReturnType<typeof useI18n>['t']): KeyValueItem[] {
  return [
    { key: 'id', label: t('autonomous.workflow.fact.id'), value: flow.id, title: flow.id },
    { key: 'stages', label: t('autonomous.workflow.fact.stages'), value: String(flow.stages.length) },
    {
      key: 'model',
      label: t('autonomous.workflow.defaults.model'),
      value: flow.defaultModel || t('autonomous.workflow.summary.providerDefault')
    },
    {
      key: 'codexModel',
      label: t('autonomous.workflow.defaults.codexModel'),
      value: flow.defaultCodexModel || t('autonomous.workflow.summary.providerDefault')
    },
    {
      key: 'source',
      label: t('autonomous.workflow.fact.source'),
      value: flow.sourceKind,
      tone: flow.sourceKind === 'legacy' ? 'warning' : 'success'
    }
  ];
}

function getNewFlowIdError(
  flowId: string,
  existingFlowIds: Set<string>,
  t: ReturnType<typeof useI18n>['t']
): string | undefined {
  if (!flowId) {
    return undefined;
  }
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(flowId) || flowId.includes('..')) {
    return t('autonomous.workflows.new.idError');
  }
  if (existingFlowIds.has(flowId)) {
    return t('autonomous.workflows.new.idExists');
  }
  return undefined;
}

function createCopyFlowId(flowId: string, existingFlowIds: Set<string>): string {
  let copyId = `${flowId}-copy`;
  let suffix = 2;
  while (existingFlowIds.has(copyId)) {
    copyId = `${flowId}-copy-${suffix}`;
    suffix += 1;
  }
  return copyId;
}
