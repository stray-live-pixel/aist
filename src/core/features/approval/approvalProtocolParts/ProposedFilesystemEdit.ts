export type ProposedFilesystemEdit = {
  path: string;
  oldContent: string | undefined;
  proposedContent: string;
  created: boolean;
  replacements?: number;
  generatedReplacements?: number;
  instructions?: string;
  strategyUsed?: string;
  diagnostics?: unknown[];
};
