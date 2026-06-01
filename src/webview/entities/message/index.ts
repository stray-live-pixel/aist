/* Публичный API entities/message — все компоненты и типы для внешнего использования. */

export { MessageCard } from './message-card';
export type { MessageCardProps } from './message-card';

export { ToolMessageCard } from './tool-message-card';
export type { ToolMessageCardProps } from './tool-message-card';

export { SubagentMessageCard } from './subagent-message-card';
export type { SubagentMessageCardProps } from './subagent-message-card';

export { ToolApprovalActions } from './tool-approval-actions';
export type { ToolApprovalActionsProps } from './tool-approval-actions';

export { ToolRawJsonModal } from './tool-raw-json-modal';
export type { ToolRawJsonModalProps } from './tool-raw-json-modal';

export { ToolResultPreview } from './tool-result-preview';
export type { BashFact, ToolResultPreviewProps } from './tool-result-preview';

export { WorkspaceFileLink } from './workspace-file-link';
export type { WorkspaceFileLinkProps } from './workspace-file-link';

export {
  formatMessageDate,
  formatMessageUsage,
  formatMessageUsagePill,
  formatToolStatusLocalized,
  getToolStatusClass
} from './message-formatting';

export { buildToolDisplayModel } from './tool-message-model';
export type { FileReference, ToolDisplayModel, ToolTone } from './tool-message-model';

export { arrayValue, asRecord, asString, getToolPreview, getToolResult } from './tool-value';
