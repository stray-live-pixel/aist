import { createToolError } from '../../../shared/lib/toolErrors';
import { type NodeFilesystemToolContext } from '../../../tools/fs/shared/nodeFilesystemToolContext';
import { FilesystemEditProposal } from './FilesystemEditProposal';
import { getReplaceInFileProposal } from './getReplaceInFileProposal';
import { getWriteFileProposal } from './getWriteFileProposal';

export async function getFilesystemEditProposal(
  context: NodeFilesystemToolContext,
  toolName: string,
  args: Record<string, unknown>
): Promise<FilesystemEditProposal> {
  switch (toolName) {
    case 'write_file':
      return getWriteFileProposal(context, args);
    case 'replace_in_file':
      return getReplaceInFileProposal(context, args);
    default:
      throw createToolError('INVALID_ARGUMENT', `Tool does not support edit preview: ${toolName}`, { toolName });
  }
}
