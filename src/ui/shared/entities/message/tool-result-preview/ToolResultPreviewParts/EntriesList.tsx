import { useI18n } from '../../../../i18n';
import { arrayValue } from '../../tool-value';
import styles from '../ToolResultPreview.module.scss';
import { LIST_PREVIEW_LIMIT } from './LIST_PREVIEW_LIMIT';
import { renderEntryItem } from './renderEntryItem';

export function EntriesList({ result }: { result: Record<string, unknown> }) {
  const { t } = useI18n();
  const entries = arrayValue(result.entries);
  const truncated = Boolean(result.truncated) || entries.length > LIST_PREVIEW_LIMIT;

  return (
    <ul className={styles.listPreview}>
      {entries.slice(0, LIST_PREVIEW_LIMIT).map(renderEntryItem)}
      {truncated ? <li className={styles.truncated}>{t('tool.preview.moreItems')}</li> : null}
    </ul>
  );
}
