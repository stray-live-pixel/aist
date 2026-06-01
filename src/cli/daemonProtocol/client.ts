import type { ApprovalPreviewResolution, EditorContextInput, JsonObject } from '../../core/shared/types/types';

export type DaemonEventsSubscribeResult = {
  readonly operationId: string;
  readonly subscribed: boolean;
};

export type DaemonClientCapabilities = {
  readonly activeEditorContext?: boolean;
  readonly notifications?: boolean;
  readonly openWorkspaceFile?: boolean;
  readonly vscodeEditableDiffPreview?: boolean;
};

export type DaemonClientCapabilitiesParams = {
  readonly capabilities: DaemonClientCapabilities;
};

export type DaemonClientCapabilitiesResult = {
  readonly operationId: string;
  readonly capabilities: DaemonClientCapabilities;
};

export type DaemonClientPreviewPrepareParams = {
  readonly previewId: string;
  readonly toolName: string;
  readonly args: JsonObject;
};

export type DaemonClientPreviewPrepareResult = {
  readonly preview?: JsonObject;
};

export type DaemonClientPreviewApproveParams = {
  readonly previewId: string;
};

export type DaemonClientPreviewCleanupParams = {
  readonly previewId: string;
};

export type DaemonClientPreviewCleanupResult = {
  readonly ok: true;
};

export type DaemonClientNotificationParams = {
  readonly level: 'info' | 'warning' | 'error' | 'status';
  readonly message: string;
  readonly timeoutMs?: number;
};

export type DaemonClientNotificationResult = {
  readonly shown: boolean;
};

export type DaemonClientOpenWorkspaceFileParams = {
  readonly path: string;
  readonly line?: number;
  readonly column?: number;
  readonly endLine?: number;
  readonly endColumn?: number;
};

export type DaemonClientOpenWorkspaceFileResult = {
  readonly opened: boolean;
};

export type DaemonClientRequestMap = {
  readonly 'client.activeEditorContext': {
    readonly params: undefined;
    readonly result: EditorContextInput | null;
  };
  readonly 'client.notification': {
    readonly params: DaemonClientNotificationParams;
    readonly result: DaemonClientNotificationResult;
  };
  readonly 'client.openWorkspaceFile': {
    readonly params: DaemonClientOpenWorkspaceFileParams;
    readonly result: DaemonClientOpenWorkspaceFileResult;
  };
  readonly 'client.previewEdit.prepare': {
    readonly params: DaemonClientPreviewPrepareParams;
    readonly result: DaemonClientPreviewPrepareResult;
  };
  readonly 'client.previewEdit.approve': {
    readonly params: DaemonClientPreviewApproveParams;
    readonly result: JsonObject;
  };
  readonly 'client.previewEdit.cleanup': {
    readonly params: DaemonClientPreviewCleanupParams;
    readonly result: DaemonClientPreviewCleanupResult;
  };
};

export type DaemonClientRequestMethod = keyof DaemonClientRequestMap;

export type DaemonClientPreviewResolution = ApprovalPreviewResolution;
