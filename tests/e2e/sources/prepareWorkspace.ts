import fs from 'node:fs/promises';
import path from 'node:path';

import { initializeWorkspaceGit } from './initializeWorkspaceGit';
import { writeWorkspaceSettings } from './writeWorkspaceSettings';

/**
 * Что это: готовит минимальный workspace для пользовательских e2e flow.
 * Зачем нужно: агент работает в настоящей папке VS Code и может выполнять list_files по реальному README.md.
 */
export async function prepareWorkspace({ workspacePath }: { workspacePath: string }): Promise<void> {
  await fs.mkdir(workspacePath, { recursive: true });
  await fs.writeFile(path.join(workspacePath, 'README.md'), '# E2E workspace\n', 'utf8');
  await writeWorkspaceSettings({ workspacePath });
  await initializeWorkspaceGit({ workspacePath });
}
