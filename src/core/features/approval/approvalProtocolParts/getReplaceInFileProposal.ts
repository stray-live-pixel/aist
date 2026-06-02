import fs from 'node:fs';

import { createToolError } from '../../../shared/lib/toolErrors';
import { type NodeFilesystemToolContext } from '../../../tools/fs/shared/nodeFilesystemToolContext';
import { resolveWorkspacePath } from '../../../tools/fs/shared/resolveWorkspacePath';
import { requireString } from '../../../tools/shared/requireString';
import { FilesystemEditProposal } from './FilesystemEditProposal';
import { createProposedEdit } from './createProposedEdit';

export async function getReplaceInFileProposal(
  context: NodeFilesystemToolContext,
  args: Record<string, unknown>
): Promise<FilesystemEditProposal> {
  const filePath = requireString({ value: args.path, name: 'path' });
  const search = requireString({ value: args.search, name: 'search' });
  const replace = requireString({ value: args.replace, name: 'replace' });
  const replaceAll = Boolean(args.all);
  const resolved = await resolveWorkspacePath({ context, relativePath: filePath, options: { allowMissing: false } });
  const oldContent = await fs.promises.readFile(resolved.absolutePath, 'utf8');

  if (!oldContent.includes(search)) {
    throw createToolError('TEXT_NOT_FOUND', `Text was not found in ${filePath}.`, { path: filePath });
  }

  const proposedContent = replaceAll ? oldContent.split(search).join(replace) : oldContent.replace(search, replace);
  const replacements = replaceAll ? oldContent.split(search).length - 1 : 1;
  return {
    files: [createProposedEdit(filePath, oldContent, proposedContent, { replacements })]
  };
}
