import path from 'node:path';

import { ProposedFilesystemEdit } from './ProposedFilesystemEdit';
import { createUnifiedDiff } from './createUnifiedDiff';

export function createUnifiedDiffForFiles(files: ProposedFilesystemEdit[]): string {
  return files
    .map((file) => createUnifiedDiff(file.path, file.oldContent, file.proposedContent))
    .filter(Boolean)
    .join('\n');
}
