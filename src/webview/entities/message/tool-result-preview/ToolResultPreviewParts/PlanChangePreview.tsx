import { type ChatMessage } from '../../../../shared/types';
import { arrayValue, asString } from '../../tool-value';
import styles from '../ToolResultPreview.module.scss';

export function PlanChangePreview({ message }: { message: ChatMessage }) {
  const title = asString(message.args?.title) || '';
  const steps = arrayValue(message.args?.steps)
    .map((step) => String(step || '').trim())
    .filter(Boolean);

  return (
    <div className={styles.planPreview}>
      {title ? <p className={styles.planTitle}>{title}</p> : null}
      <ol className={styles.planSteps}>
        {steps.map((step, index) => (
          <li key={`${index}-${step}`}>{step}</li>
        ))}
      </ol>
    </div>
  );
}
