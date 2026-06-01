import { type RuntimeClientCapabilities } from '../../../shared/types/types';
import { CreateToolApprovalRequestInput } from './CreateToolApprovalRequestInput';

export type PrepareFilesystemToolApprovalInput = Omit<
  CreateToolApprovalRequestInput,
  'previewKind' | 'previewPayload' | 'createdAt'
> & {
  workspaceRoot: string;
  workspaceName?: string;
  activeFile?: string | null;
  activeLanguage?: string | null;
  clientCapabilities?: RuntimeClientCapabilities;
  createdAt?: number;
  writeHeadlessArtifact?: boolean;
};
