import { ProposedFilesystemEdit } from './ProposedFilesystemEdit';

export type FilesystemEditProposal = {
  files: ProposedFilesystemEdit[];
  patch?: string;
  instructions?: string;
  strategyUsed?: string;
  diagnostics?: unknown[];
};
