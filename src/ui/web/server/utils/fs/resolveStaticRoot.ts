import fs from 'node:fs';
import path from 'node:path';

export function resolveStaticRoot(): string {
  const candidates = [
    path.resolve(process.cwd(), 'dist/ui/web'),
    path.resolve(__dirname, '../ui/web'),
    path.resolve(__dirname, '../../dist/ui/web'),
    path.resolve(__dirname, '../../../../../../dist/ui/web')
  ];
  const found = candidates.find((candidate) => fs.existsSync(path.join(candidate, 'index.html')));
  if (!found) {
    throw new Error(`Web UI assets not found. Run 'npm run build:web' first. Checked: ${candidates.join(', ')}`);
  }

  return found;
}
