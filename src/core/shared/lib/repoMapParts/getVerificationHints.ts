import { PackageManager } from './PackageManager';

export function getVerificationHints(packageManager: PackageManager | null, scripts: string[]): string[] {
  if (!packageManager || !scripts.length) {
    return [];
  }

  const preferredScripts = [
    'typecheck',
    'test',
    'compile',
    'build',
    'lint',
    'test:unit',
    'test:watch',
    'test:e2e',
    'package'
  ];

  return preferredScripts
    .filter((script) => scripts.includes(script))
    .slice(0, 5)
    .map((script) => `${packageManager} run ${script}`);
}
