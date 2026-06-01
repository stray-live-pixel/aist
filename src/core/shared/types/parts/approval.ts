import type { JsonObject, JsonValue } from './json';
import type { RuntimeToolResult } from './toolResult';

export type ApprovalDecisionAction = 'approve' | 'deny-stop' | 'deny-continue';
export type ApprovalStatus = 'pending' | 'approved' | 'denied';
export type ApprovalPreviewKind = 'none' | 'vscode-editable-diff' | 'headless-diff-artifact';
export type ToolExecutionMode = 'auto' | 'approval' | 'ui-assisted-preview';
export type ToolPermissionMode = 'ask' | 'auto';

export type RuntimeClientCapabilities = {
  vscodeEditableDiffPreview?: boolean;
};

export type RuntimeArtifactRef = JsonObject & {
  path: string;
  absolutePath?: string;
  bytes?: number;
  mimeType?: string;
  description?: string;
};

export type ApprovalPreviewFile = JsonObject & {
  path: string;
  oldContent?: string;
  proposedContent?: string;
  created?: boolean;
  replacements?: number;
  generatedReplacements?: number;
  changedStartLine?: number;
  changedStartColumn?: number;
  changedEndLine?: number;
  changedEndColumn?: number;
};

export type ApprovalPreviewPayload = JsonObject & {
  files?: ApprovalPreviewFile[];
  patch?: string;
  artifact?: RuntimeArtifactRef;
  instructions?: string;
  strategyUsed?: string;
  diagnostics?: JsonValue[];
};

export type ToolApprovalRequest = JsonObject & {
  approvalId: string;
  runId: string;
  toolCallId: string;
  toolName: string;
  reason?: string;
  args: JsonObject;
  previewKind: ApprovalPreviewKind;
  previewPayload?: ApprovalPreviewPayload;
  status: ApprovalStatus;
  createdAt: number;
  updatedAt?: number;
  chatId?: string;
  messageId?: string;
};

export type ApprovalResolveRequest = {
  decision: ApprovalDecisionAction;
  comment?: string;
  rememberGlobal?: string;
  rememberProject?: string;
  previewResult?: ApprovalPreviewResolution;
};

export type ApprovalPreviewResolvedFile = JsonObject & {
  path: string;
  content: string;
  result?: RuntimeToolResult;
};

export type ApprovalPreviewResolution = JsonObject & {
  kind: 'file-content' | 'multi-file-content' | 'tool-result';
  path?: string;
  content?: string;
  files?: ApprovalPreviewResolvedFile[];
  result?: RuntimeToolResult;
};

export type ToolExecutionRequirement =
  | { mode: 'auto' }
  | { mode: 'approval'; previewKind?: Exclude<ApprovalPreviewKind, 'vscode-editable-diff'> }
  | { mode: 'ui-assisted-preview'; previewKind: 'vscode-editable-diff' };

/**
 * User decision for a tool approval prompt.
 *
 * approved runs the tool and may pass a note back to the model as userApprovalComment;
 * denial either stops the current agent loop or returns a denied tool result to the model.
 */
export type ToolApprovalDecision = {
  action?: ApprovalDecisionAction;
  approved: boolean;
  continueAfterDeny: boolean;
  comment?: string;
  rememberGlobal?: string;
  rememberProject?: string;
  previewResult?: ApprovalPreviewResolution;
};
