import { Rocket } from 'lucide-react';

import { type AutonomousEngineId, type AutonomousState } from '../../../shared/types';
import { Card, Select, Switch, TextArea } from '../../../shared/ui';
import styles from '../AutonomousPage.module.scss';

export function LaunchOptionsCard({
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
