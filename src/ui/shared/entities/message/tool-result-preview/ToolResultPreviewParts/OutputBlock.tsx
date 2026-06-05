import { ChevronRight } from 'lucide-react';

import { useI18n } from '../../../../shared/i18n';
import styles from '../ToolResultPreview.module.scss';
import { getLineCountLabel } from '../utils';

export function OutputBlock({ label, text, tone }: { label: string; text: string; tone: 'stdout' | 'stderr' }) {
  const { language, t } = useI18n();

  return (
    <details className={`${styles.details} ${styles.outputBlock} ${tone === 'stderr' ? styles.stderr : ''}`} open>
      <summary>
        <ChevronRight size={13} />
        <span>{label}</span>
        <em>{getLineCountLabel(text, language, t)}</em>
      </summary>
      <pre className={styles.codePreview}>{text}</pre>
    </details>
  );
}
