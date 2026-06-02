import { PackageManager } from './PackageManager';
import { exists } from './exists';

export function detectPackageManager(
  workspacePath: string,
  packageJson: Record<string, unknown> | undefined
): PackageManager | null {
  const packageManager = typeof packageJson?.packageManager === 'string' ? packageJson.packageManager : '';

  if (packageManager.startsWith('pnpm@')) return 'pnpm';
  if (packageManager.startsWith('yarn@')) return 'yarn';
  if (packageManager.startsWith('bun@')) return 'bun';
  if (packageManager.startsWith('npm@')) return 'npm';

  if (exists(workspacePath, 'pnpm-lock.yaml')) return 'pnpm';
  if (exists(workspacePath, 'yarn.lock')) return 'yarn';
  if (exists(workspacePath, 'bun.lock') || exists(workspacePath, 'bun.lockb')) return 'bun';
  if (exists(workspacePath, 'package-lock.json') || packageJson) return 'npm';

  return null;
}
