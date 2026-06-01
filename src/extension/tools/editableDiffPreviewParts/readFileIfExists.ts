import * as vscode from 'vscode';

import { textDecoder } from './textDecoder';

export async function readFileIfExists(uri: vscode.Uri): Promise<string | undefined> {
  try {
    return textDecoder.decode(await vscode.workspace.fs.readFile(uri));
  } catch {
    return undefined;
  }
}
