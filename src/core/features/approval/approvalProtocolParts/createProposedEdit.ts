import { ProposedFilesystemEdit } from './ProposedFilesystemEdit';

export function createProposedEdit(
  filePath: string,
  oldContent: string | undefined,
  proposedContent: string,
  extra: Partial<ProposedFilesystemEdit> = {}
): ProposedFilesystemEdit {
  return {
    path: filePath,
    oldContent,
    proposedContent,
    created: oldContent === undefined,
    ...extra
  };
}
