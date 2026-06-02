import { Database, Download, GitBranch, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';

import { autonomousActions } from '../../../shared/lib/autonomousActions';
import { type AutonomousEngineId } from '../../../shared/types';
import { Button, Card, Text } from '../../../shared/ui';
import styles from '../AutonomousPage.module.scss';
import { AutonomousHeader } from './AutonomousHeader';
import { AutonomousPageProps } from './AutonomousPageProps';
import { AutonomousRoute } from './AutonomousRoute';
import { FlowEditorPage } from './FlowEditorPage';
import { FlowsPage } from './FlowsPage';
import { LaunchDraft } from './LaunchDraft';
import { LaunchOptionsCard } from './LaunchOptionsCard';
import { RunList } from './RunList';
import { SessionsCard } from './SessionsCard';

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
