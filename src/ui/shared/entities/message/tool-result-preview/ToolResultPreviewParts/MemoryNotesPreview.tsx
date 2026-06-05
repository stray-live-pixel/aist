import { Database } from 'lucide-react';

import { useI18n } from '../../../../i18n';
import { asString } from '../../tool-value';
import styles from '../ToolResultPreview.module.scss';
import { parseMemoryNotes } from './parseMemoryNotes';

export function MemoryNotesPreview({ result }: { result?: Record<string, unknown> }) {
  const { t } = useI18n();
  const notes = parseMemoryNotes({ notes: asString(result?.notes) || '' });
  const policy = asString(result?.policy);

  if (!notes.length) {
    return <p className={styles.compactFacts}>{t('tool.preview.memoryEmpty')}</p>;
  }

  return (
    <div className={styles.memoryPreview}>
      <div className={styles.memoryHeader}>
        <Database size={13} />
        <span>{t('tool.preview.memoryApplied')}</span>
      </div>
      <ul className={styles.memoryNotes}>
        {notes.map((note, index) => (
          <li key={`${index}-${note}`}>{note}</li>
        ))}
      </ul>
      {policy ? <p className={styles.memoryPolicy}>{policy}</p> : null}
    </div>
  );
}
