import { Badge } from '../badge';
import styles from './PipelineSteps.module.scss';

export type PipelineStep = {
  id: string;
  title: string;
  status?: 'pending' | 'running' | 'done' | 'error' | 'stopped';
};

export type PipelineStepsProps = {
  steps: PipelineStep[];
};

/**
 * Что это: горизонтальный список этапов pipeline.
 * Почему shared: flow stages нужны autonomous dashboard и будущим session exports,
 * а статусные цвета должны оставаться едиными с Badge tones.
 */
export function PipelineSteps({ steps }: PipelineStepsProps) {
  return (
    <ol className={styles.steps}>
      {steps.map((step) => (
        <li key={step.id} className={styles.step}>
          <span className={styles.dot} aria-hidden="true" />
          <span className={styles.title}>{step.title}</span>
          {step.status ? <Badge tone={toTone(step.status)}>{step.status}</Badge> : null}
        </li>
      ))}
    </ol>
  );
}

function toTone(status: PipelineStep['status']): 'neutral' | 'accent' | 'success' | 'warning' | 'danger' {
  if (status === 'done') {
    return 'success';
  }
  if (status === 'running') {
    return 'accent';
  }
  if (status === 'error') {
    return 'danger';
  }
  if (status === 'stopped') {
    return 'warning';
  }
  return 'neutral';
}
