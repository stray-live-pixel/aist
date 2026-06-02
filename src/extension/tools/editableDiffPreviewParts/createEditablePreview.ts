import * as vscode from 'vscode';

import { EditableDiffPreview } from './EditableDiffPreview';
import { closeDiffEditor } from './closeDiffEditor';
import { getChangedLineRange } from './getChangedLineRange';
import { originalContents } from './originalContents';
import { rollbackPreview } from './rollbackPreview';
import { saveAndReadDocument } from './saveAndReadDocument';

export function createEditablePreview(params: {
  filePath: string;
  targetUri: vscode.Uri;
  originalUri: vscode.Uri;
  diffTitle: string;
  originalContent: string;
  originalExists: boolean;
  generatedReplacements?: number;
}): EditableDiffPreview {
  let accepted = false;
  let cleaned = false;

  return {
    preview: {
      ok: true,
      path: params.filePath,
      diffShown: true,
      editable: true
    },
    approve: async () => {
      accepted = true;
      const finalContent = await saveAndReadDocument(params.targetUri);
      const changedRange = getChangedLineRange(params.originalContent, finalContent);
      await closeDiffEditor(params.diffTitle);
      return {
        ok: true,
        path: params.filePath,
        bytes: Buffer.byteLength(finalContent, 'utf8'),
        ...changedRange,
        ...(params.generatedReplacements === undefined ? {} : { generatedReplacements: params.generatedReplacements })
      };
    },
    cleanup: async () => {
      if (cleaned) return;
      cleaned = true;
      originalContents.delete(params.originalUri.toString());
      if (!accepted) {
        await rollbackPreview(params.targetUri, params.originalContent, params.originalExists);
      }
    }
  };
}
