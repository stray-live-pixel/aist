export type EditableDiffPreview = {
  preview: Record<string, unknown>;
  approve(): Promise<Record<string, unknown>>;
  cleanup(): Promise<void>;
};
