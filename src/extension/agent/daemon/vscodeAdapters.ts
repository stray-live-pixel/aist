import * as vscode from 'vscode';

import type { AgentRuntimeLogger } from '../../../core/agentRuntime';
import type { EditorContextInput } from '../../../core/contextGovernor';
import type { ApprovalPreviewKind, ToolApprovalRequest } from '../../../core/types';
import { t } from '../../shared/i18n';
import type { AistLogger } from '../../shared/logger';
import type { FilesystemToolPreview } from '../../tools/previewEdits';
import { previewFilesystemApprovalRequest } from '../../tools/previewEdits';
import { normalizeEditorContextMode } from '../config/config';
import { getApprovalNotificationSettings } from '../config/notifications';

type VscodeApi = typeof vscode;

export type VscodeWorkspaceRootProvider = {
  getWorkspaceRoot(): string;
  getWorkspaceName(): string;
};

export type VscodeActiveEditorContextProvider = {
  getEditorContext(): EditorContextInput | undefined;
};

export type VscodePreviewEditProvider = {
  prepare(toolName: string, args: Record<string, unknown>): Promise<VscodePreviewEdit | undefined>;
};

export type VscodePreviewEdit = FilesystemToolPreview & {
  approvalPreviewKind: ApprovalPreviewKind;
};

export type VscodeStatusNotifier = {
  showApprovalWait(toolName: string): void;
  setStatus(message: string, timeoutMs?: number): void;
  showWarning(message: string): void;
};

export class VscodeWorkspaceRootAdapter implements VscodeWorkspaceRootProvider {
  constructor(private readonly api: VscodeApi = vscode) {}

  getWorkspaceRoot(): string {
    const folder = this.api.workspace.workspaceFolders?.[0];
    if (!folder) {
      throw new Error('Open a VS Code workspace folder before using the AIST daemon runtime.');
    }

    return folder.uri.fsPath;
  }

  getWorkspaceName(): string {
    return this.api.workspace.workspaceFolders?.[0]?.name || 'No workspace';
  }
}

export class VscodeActiveEditorContextAdapter implements VscodeActiveEditorContextProvider {
  constructor(private readonly api: VscodeApi = vscode) {}

  getEditorContext(): EditorContextInput | undefined {
    const editor = this.api.window.activeTextEditor;
    if (!editor) {
      return undefined;
    }

    const config = this.api.workspace.getConfiguration('openrouterAgent');
    const document = editor.document;
    return {
      fileName: document.fileName,
      languageId: document.languageId,
      selectionText: document.getText(editor.selection),
      fullText: document.getText(),
      maxChars: config.get<number>('maxContextChars') || 12000,
      mode: normalizeEditorContextMode(config.get<string>('editorContextMode'))
    };
  }
}

export class VscodePreviewEditAdapter implements VscodePreviewEditProvider {
  constructor(
    private readonly previewRequest: (
      request: ToolApprovalRequest
    ) => Promise<FilesystemToolPreview | undefined> = previewFilesystemApprovalRequest
  ) {}

  async prepare(toolName: string, args: Record<string, unknown>): Promise<VscodePreviewEdit | undefined> {
    const preview = await this.previewRequest({
      approvalId: 'vscode-preview',
      runId: 'vscode-preview-run',
      toolCallId: 'vscode-preview-tool-call',
      toolName,
      reason: typeof args.reason === 'string' ? args.reason : undefined,
      args: args as ToolApprovalRequest['args'],
      previewKind: 'vscode-editable-diff',
      status: 'pending',
      createdAt: Date.now()
    });

    return preview ? { ...preview, approvalPreviewKind: 'vscode-editable-diff' } : undefined;
  }
}

export class VscodeStatusNotificationAdapter implements VscodeStatusNotifier {
  constructor(private readonly api: VscodeApi = vscode) {}

  showApprovalWait(toolName: string): void {
    const settings = getApprovalNotificationSettings();
    if (!settings.enabled || !settings.systemNotifications) {
      return;
    }

    void this.api.window.showInformationMessage(
      `${t('approval.notification.title')}: ${t('approval.notification.message', { tool: toolName })}`,
      { modal: false }
    );
  }

  setStatus(message: string, timeoutMs?: number): void {
    if (timeoutMs === undefined) {
      this.api.window.setStatusBarMessage(message);
      return;
    }

    this.api.window.setStatusBarMessage(message, timeoutMs);
  }

  showWarning(message: string): void {
    void this.api.window.showWarningMessage(message);
  }
}

export class VscodeCoreLoggerAdapter implements AgentRuntimeLogger {
  constructor(private readonly logger: AistLogger) {}

  info(message: string, details?: unknown): void {
    this.logger.info(message, details);
  }

  error(message: string, error?: unknown): void {
    this.logger.error(message, error);
  }
}
