import { FileCode2 } from 'lucide-react';
import { vscode } from '../../shared/lib/vscode';
import type { FileReference } from './toolMessageModel';

/**
 * Что это: единая ссылка на файл из результата инструмента.
 * Зачем нужно: любой tool-call с path открывает файл в VS Code одним кликом.
 * Пример: <WorkspaceFileLink file={{ path: 'src/index.ts', line: 10 }} />.
 */
export function WorkspaceFileLink({ file }: { file: FileReference }) {
  const label = file.line ? `${file.path}:${file.line}` : file.path;

  return (
    <button
      className="tool-file-link"
      title="Открыть файл в редакторе"
      onClick={(event) => {
        event.stopPropagation();
        vscode.postMessage({
          type: 'openWorkspaceFile',
          path: file.path,
          line: file.line,
          column: file.column
        });
      }}
    >
      <FileCode2 size={13} />
      <span className="truncate">{file.label ? `${label} · ${file.label}` : label}</span>
    </button>
  );
}
