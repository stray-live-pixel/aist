import { type NodeFilesystemToolContext } from '../../../tools/fs/shared/nodeFilesystemToolContext';
import { readTextFileIfExists } from '../../../tools/fs/shared/readTextFileIfExists';
import { resolveWorkspacePath } from '../../../tools/fs/shared/resolveWorkspacePath';
import { requireString } from '../../../tools/shared/requireString';
import { FilesystemEditProposal } from './FilesystemEditProposal';
import { createProposedEdit } from './createProposedEdit';

export async function getWriteFileProposal(
  context: NodeFilesystemToolContext,
  args: Record<string, unknown>
): Promise<FilesystemEditProposal> {
  const filePath = requireString({ value: args.path, name: 'path' });
  const proposedContent = requireString({ value: args.content, name: 'content' });
  const resolved = await resolveWorkspacePath({ context, relativePath: filePath, options: { allowMissing: true } });
  const oldContent = await readTextFileIfExists({ filePath: resolved.absolutePath });

  return {
    files: [createProposedEdit(filePath, oldContent, proposedContent)]
  };
}
