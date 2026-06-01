import { ArrowLeft, Download, GitBranch, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { autonomousActions } from '../../../shared/lib/autonomousActions';
import { type AutonomousFlowDefinition, type AutonomousState } from '../../../shared/types';
import { Badge, Button, Card, EmptyState, Text, TextField } from '../../../shared/ui';
import styles from '../AutonomousPage.module.scss';

export function FlowsPage({
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
