import { FileCode2 } from 'lucide-react';

import { useI18n } from '../../../shared/i18n';
import { vscode } from '../../../shared/lib/vscode';
import styles from './WorkspaceFileLink.module.scss';
import type { WorkspaceFileLinkProps } from './types';

/**
 * Что это: единая ссылка на файл из результата инструмента.
 * Зачем нужно: любой tool-call с path открывает файл в VS Code одним кликом.
 * Пример: <WorkspaceFileLink file={{ path: 'src/index.ts', line: 10 }} />.
 */
export function WorkspaceFileLink({ file }: WorkspaceFileLinkProps) {
  const { t } = useI18n();
  const label = file.line ? `${file.path}:${file.line}` : file.path;

  return (
    <button
      className={styles.root}
      title={t('tool.openFile')}
      onClick={(event) => {
        event.stopPropagation();
        vscode.postMessage({
          type: 'openWorkspaceFile',
          path: file.path,
          line: file.line,
          column: file.column,
          endLine: file.endLine,
          endColumn: file.endColumn
        });
      }}
    >
      <FileCode2 size={13} />
      <span className={styles.label}>{file.label ? `${label} · ${file.label}` : label}</span>
    </button>
  );
}
