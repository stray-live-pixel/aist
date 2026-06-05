import { ChevronRight } from 'lucide-react';

import { useI18n } from '../../../../i18n';
import { asString } from '../../tool-value';
import styles from '../ToolResultPreview.module.scss';
import { CODE_PREVIEW_LIMIT } from './CODE_PREVIEW_LIMIT';

export function CodePreview({ result }: { result: Record<string, unknown> }) {
  const { t } = useI18n();
  const content = asString(result.content) || '';
  const isLong = content.length > CODE_PREVIEW_LIMIT;
  const isTruncated = Boolean(result.truncated) || Boolean(result.truncatedRange) || isLong;
  const preview = isLong ? `${content.slice(0, CODE_PREVIEW_LIMIT)}\n…` : content;

  return (
    <details className={styles.details} open={!isLong}>
      <summary>
        <ChevronRight size={13} />
        {t('tool.preview.code')} {isTruncated ? `· ${t('tool.preview.truncated')}` : ''}
      </summary>
      <pre className={styles.codePreview}>{preview || t('tool.preview.emptyFile')}</pre>
    </details>
  );
}
