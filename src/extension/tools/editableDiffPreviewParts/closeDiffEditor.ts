import * as vscode from 'vscode';

export async function closeDiffEditor(diffTitle: string): Promise<void> {
  const tab = vscode.window.tabGroups.all.flatMap((group) => group.tabs).find((item) => item.label === diffTitle);
  if (tab) {
    await vscode.window.tabGroups.close(tab);
  }
}
