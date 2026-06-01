import * as vscode from 'vscode';

import { ensureGlobalDefaults } from './ensureGlobalDefaults';

export function initializeAgentConfigStore(_context: vscode.ExtensionContext): void {
  ensureGlobalDefaults();
}
