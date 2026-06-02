import { useI18n } from '../../../../shared/i18n';
import { type ChatMessage } from '../../../../shared/types';
import { asString } from '../../tool-value';
import styles from '../ToolResultPreview.module.scss';
import { getPlanStatusLabel } from './getPlanStatusLabel';

export function PlanStatusPreview({ message, result }: { message: ChatMessage; result?: Record<string, unknown> }) {
  const { t } = useI18n();
  const index = String(message.args?.itemIndex || result?.itemIndex || '');
  const status = getPlanStatusLabel(asString(message.args?.status) || asString(result?.status) || '', t);

  return (
    <p className={styles.compactFacts}>
      {t('tool.target.planItem', { index })}: {status}
    </p>
  );
}
