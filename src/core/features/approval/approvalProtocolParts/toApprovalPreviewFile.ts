import path from 'node:path';

import { type ApprovalPreviewFile } from '../../../shared/types/types';
import { getChangedLineRange } from '../../../tools/shared/getChangedLineRange';
import { ProposedFilesystemEdit } from './ProposedFilesystemEdit';
import { removeUndefinedValues } from './removeUndefinedValues';

export function toApprovalPreviewFile(file: ProposedFilesystemEdit, includeContents: boolean): ApprovalPreviewFile {
  return removeUndefinedValues({
    path: file.path,
    oldContent: includeContents ? file.oldContent : undefined,
    proposedContent: includeContents ? file.proposedContent : undefined,
    created: file.created,
    replacements: file.replacements,
    generatedReplacements: file.generatedReplacements,
    ...getChangedLineRange({ beforeContent: file.oldContent || '', afterContent: file.proposedContent })
  }) as ApprovalPreviewFile;
}
