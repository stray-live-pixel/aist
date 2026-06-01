export function isUsefulTopLevelDir(name: string): boolean {
  if (['.git', '.vscode-test', 'node_modules', 'dist', 'out', 'build', 'coverage', 'storybook-static'].includes(name)) {
    return false;
  }

  return !name.startsWith('.') || ['.github', '.storybook', '.vscode'].includes(name);
}
