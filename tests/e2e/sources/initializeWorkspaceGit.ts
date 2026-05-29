import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Что это: инициализирует минимальный git-репозиторий в e2e workspace.
 * Зачем нужно: AIST при открытии чата обновляет VCS-состояние, и тестовый проект должен вести себя как обычный repo без error modal.
 */
export async function initializeWorkspaceGit({ workspacePath }: { workspacePath: string }): Promise<void> {
  await execFileAsync('git', ['init', '-b', 'main'], { cwd: workspacePath });
  await execFileAsync('git', ['config', 'user.email', 'e2e@example.local'], { cwd: workspacePath });
  await execFileAsync('git', ['config', 'user.name', 'AIST E2E'], { cwd: workspacePath });
  await execFileAsync('git', ['add', 'README.md', '.vscode/settings.json'], { cwd: workspacePath });
  await execFileAsync('git', ['commit', '-m', 'Initial e2e workspace'], { cwd: workspacePath });
}
