import * as vscode from 'vscode';

import { DIFF_SCHEME } from './DIFF_SCHEME';
import { originalContents } from './originalContents';
import { providerRegistrationState } from './providerRegistered';

export function registerOriginalContentProvider(): void {
  if (providerRegistrationState.registered) return;
  providerRegistrationState.registered = true;
  vscode.workspace.registerTextDocumentContentProvider(DIFF_SCHEME, {
    provideTextDocumentContent(uri) {
      return originalContents.get(uri.toString()) ?? '';
    }
  });
}
