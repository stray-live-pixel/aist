import { downloadAndUnzipVSCode } from '@vscode/test-electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '..');
const cachePath = process.env.VSCODE_E2E_CACHE_PATH || path.join(workspaceRoot, '.vscode-test');
const version = process.env.VSCODE_E2E_VERSION || 'stable';

const executablePath = await downloadAndUnzipVSCode({
  version,
  cachePath,
  extensionDevelopmentPath: workspaceRoot
});

console.log(`VS Code для e2e готов: ${executablePath}`);
