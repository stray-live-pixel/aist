import { ListTree } from 'lucide-react';

import { type FileReference } from '../../tool-message-model';
import { WorkspaceFileLink } from '../../workspace-file-link';

export function renderSearchFile(file: FileReference) {
  return (
    <li key={`${file.path}:${file.line || 0}:${file.column || 0}`}>
      <ListTree size={13} />
      <WorkspaceFileLink file={file} />
    </li>
  );
}
