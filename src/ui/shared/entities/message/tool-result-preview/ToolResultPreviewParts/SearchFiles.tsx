import { useI18n } from '../../../../i18n';
import styles from '../ToolResultPreview.module.scss';
import { getUniqueSearchFiles } from '../utils';
import { LIST_PREVIEW_LIMIT } from './LIST_PREVIEW_LIMIT';
import { renderSearchFile } from './renderSearchFile';

export function SearchFiles({ result }: { result: Record<string, unknown> }) {
  const { t } = useI18n();
  const files = getUniqueSearchFiles(result);
  const truncated = Boolean(result.truncated) || files.length > LIST_PREVIEW_LIMIT;

  return (
    <ul className={`${styles.listPreview} ${styles.listVertical}`}>
      {files.slice(0, LIST_PREVIEW_LIMIT).map(renderSearchFile)}
      {truncated ? <li className={styles.truncated}>{t('tool.preview.moreFiles')}</li> : null}
    </ul>
  );
}
