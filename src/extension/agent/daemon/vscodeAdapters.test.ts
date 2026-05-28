import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  VscodeActiveEditorContextAdapter,
  VscodeCoreLoggerAdapter,
  VscodePreviewEditAdapter,
  VscodeStatusNotificationAdapter,
  VscodeWorkspaceRootAdapter
} from './vscodeAdapters';

const vscodeMock = vi.hoisted(() => {
  const state: {
    workspaceFolders?: Array<{ uri: { fsPath: string }; name: string }>;
    config: Record<string, unknown>;
    activeTextEditor?: unknown;
  } = {
    workspaceFolders: [{ uri: { fsPath: '/workspace' }, name: 'workspace' }],
    config: {},
    activeTextEditor: undefined
  };

  return {
    state,
    showInformationMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    setStatusBarMessage: vi.fn()
  };
});

vi.mock('vscode', () => ({
  workspace: {
    get workspaceFolders() {
      return vscodeMock.state.workspaceFolders;
    },
    getConfiguration: () => ({
      get: (key: string) => vscodeMock.state.config[key]
    })
  },
  window: {
    get activeTextEditor() {
      return vscodeMock.state.activeTextEditor;
    },
    showInformationMessage: vscodeMock.showInformationMessage,
    showWarningMessage: vscodeMock.showWarningMessage,
    setStatusBarMessage: vscodeMock.setStatusBarMessage
  }
}));

describe('VS Code daemon runtime adapters', () => {
  beforeEach(() => {
    vscodeMock.state.workspaceFolders = [{ uri: { fsPath: '/workspace' }, name: 'workspace' }];
    vscodeMock.state.config = {};
    vscodeMock.state.activeTextEditor = undefined;
    vscodeMock.showInformationMessage.mockReset();
    vscodeMock.showWarningMessage.mockReset();
    vscodeMock.setStatusBarMessage.mockReset();
  });

  it('provides the current workspace root and name', () => {
    const adapter = new VscodeWorkspaceRootAdapter();

    expect(adapter.getWorkspaceRoot()).toBe('/workspace');
    expect(adapter.getWorkspaceName()).toBe('workspace');
  });

  it('maps the active editor into core editor context input', () => {
    const selection = { isEmpty: false };
    vscodeMock.state.config = {
      maxContextChars: 50,
      editorContextMode: 'selection'
    };
    vscodeMock.state.activeTextEditor = {
      selection,
      document: {
        fileName: '/workspace/src/index.ts',
        languageId: 'typescript',
        getText: (range?: unknown) => (range === selection ? 'const value = 1;' : 'const value = 1;\n')
      }
    };

    expect(new VscodeActiveEditorContextAdapter().getEditorContext()).toEqual({
      fileName: '/workspace/src/index.ts',
      languageId: 'typescript',
      selectionText: 'const value = 1;',
      fullText: 'const value = 1;\n',
      maxChars: 50,
      mode: 'selection'
    });
  });

  it('wraps VS Code editable diff previews in the core approval preview protocol', async () => {
    const previewRequest = vi.fn(async () => ({
      preview: { ok: true, diffShown: true },
      approve: vi.fn(async () => ({ ok: true })),
      cleanup: vi.fn(async () => undefined)
    }));
    const adapter = new VscodePreviewEditAdapter(previewRequest);

    const preview = await adapter.prepare('write_file', {
      reason: 'edit through preview',
      path: 'src/index.ts',
      content: 'next'
    });

    expect(preview?.approvalPreviewKind).toBe('vscode-editable-diff');
    expect(preview?.preview).toEqual({ ok: true, diffShown: true });
    expect(previewRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        toolName: 'write_file',
        previewKind: 'vscode-editable-diff',
        status: 'pending'
      })
    );
  });

  it('routes approval notifications and status messages through VS Code APIs', () => {
    vscodeMock.state.config = {
      approvalNotifications: { enabled: true, systemNotifications: true }
    };
    const notifier = new VscodeStatusNotificationAdapter();

    notifier.showApprovalWait('write_file');
    notifier.setStatus('Created chat', 1000);
    notifier.showWarning('Core bridge fell back');

    expect(vscodeMock.showInformationMessage).toHaveBeenCalledWith(expect.stringContaining('write_file'), {
      modal: false
    });
    expect(vscodeMock.setStatusBarMessage).toHaveBeenCalledWith('Created chat', 1000);
    expect(vscodeMock.showWarningMessage).toHaveBeenCalledWith('Core bridge fell back');
  });

  it('adapts the extension logger to the core runtime logger contract', () => {
    const logger = {
      info: vi.fn(),
      error: vi.fn(),
      show: vi.fn(),
      dispose: vi.fn()
    };
    const adapter = new VscodeCoreLoggerAdapter(logger);

    adapter.info('Runtime started', { runId: 'run-1' });
    adapter.error('Runtime failed', new Error('boom'));

    expect(logger.info).toHaveBeenCalledWith('Runtime started', { runId: 'run-1' });
    expect(logger.error).toHaveBeenCalledWith('Runtime failed', expect.any(Error));
  });
});
