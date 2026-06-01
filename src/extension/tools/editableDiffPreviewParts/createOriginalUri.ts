import path from 'node:path';
import * as vscode from 'vscode';

import { DIFF_SCHEME } from './DIFF_SCHEME';

export function createOriginalUri(filePath: string): vscode.Uri {
  return vscode.Uri.from({
    scheme: DIFF_SCHEME,
    path: `/${filePath}`,
    query: String(Date.now())
  });
}
