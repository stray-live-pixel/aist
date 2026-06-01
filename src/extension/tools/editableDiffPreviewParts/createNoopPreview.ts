import { EditableDiffPreview } from './EditableDiffPreview';

export function createNoopPreview(filePath: string): EditableDiffPreview {
  return {
    preview: {
      ok: true,
      path: filePath,
      diffShown: false,
      reason: 'No file changes to preview.'
    },
    approve: async () => ({ ok: true, path: filePath, changed: false }),
    cleanup: async () => {}
  };
}
