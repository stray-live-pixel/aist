import { type FileReference } from '../../tool-message-model';
import { WorkspaceFileLink } from '../../workspace-file-link';
import styles from '../ToolResultPreview.module.scss';

export function FileLinks({ files }: { files: FileReference[] }) {
  return (
    <div className={styles.fileLinks}>
      {files.map((file) => (
        <WorkspaceFileLink key={`${file.path}:${file.line || 0}:${file.column || 0}`} file={file} />
      ))}
    </div>
  );
}
