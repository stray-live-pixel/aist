export function getPackageScripts(packageJson: Record<string, unknown> | undefined): string[] {
  const scripts = packageJson?.scripts;
  if (!scripts || typeof scripts !== 'object' || Array.isArray(scripts)) {
    return [];
  }

  return Object.keys(scripts).sort((left, right) => left.localeCompare(right));
}
