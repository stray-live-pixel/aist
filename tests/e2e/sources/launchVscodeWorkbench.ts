import { chromium } from '@playwright/test';
import { resolveCliArgsFromVSCodeExecutablePath } from '@vscode/test-electron';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { collectProcessLogs } from '../utils/collectProcessLogs';
import { getFreePortInRange } from '../utils/getFreePortInRange';
import type { VscodeWorkbenchSession } from './VscodeWorkbenchSession';
import { prepareWorkspace } from './prepareWorkspace';
import { resolveVscodeExecutablePath } from './resolveVscodeExecutablePath';
import { waitForCdp } from './waitForCdp';
import { waitForWorkbenchPage } from './waitForWorkbenchPage';

const extensionPath = path.resolve(__dirname, '../../..');

/**
 * Что это: поднимает реальный VS Code workbench с extensionDevelopmentPath текущего расширения.
 * Зачем нужно: e2e проверяет AIST в настоящем VS Code окружении, а не в jsdom или Storybook.
 */
export async function launchVscodeWorkbench({
  openRouterEndpoint
}: {
  openRouterEndpoint: string;
}): Promise<VscodeWorkbenchSession> {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'aist-e2e-'));
  const workspacePath = path.join(tmpRoot, 'workspace');
  const userDataDir = path.join(tmpRoot, 'user-data');
  const extensionsDir = path.join(tmpRoot, 'extensions');
  const remoteDebuggingPort = await getFreePortInRange({ min: 49_000, max: 50_000 });

  await prepareWorkspace({ workspacePath });

  const vscodeExecutablePath = await resolveVscodeExecutablePath();
  const [codeCli, ...codeCliArgs] = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath, {
    reuseMachineInstall: true
  });

  const vscodeProcess = spawn(
    codeCli,
    [
      ...codeCliArgs,
      `--remote-debugging-port=${remoteDebuggingPort}`,
      '--no-sandbox',
      '--disable-gpu-sandbox',
      '--disable-updates',
      '--skip-welcome',
      '--skip-release-notes',
      '--disable-workspace-trust',
      '--new-window',
      `--user-data-dir=${userDataDir}`,
      `--extensions-dir=${extensionsDir}`,
      `--extensionDevelopmentPath=${extensionPath}`,
      '--wait',
      workspacePath
    ],
    {
      env: {
        ...process.env,
        AIST_E2E_OPENROUTER_ENDPOINT: openRouterEndpoint,
        OPENROUTER_API_KEY: 'aist-e2e-fake-key',
        VSCODE_E2E: '1'
      },
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );
  const logs = collectProcessLogs({ process: vscodeProcess });

  await waitForCdp({ port: remoteDebuggingPort, process: vscodeProcess, logs });
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${remoteDebuggingPort}`);
  const page = await waitForWorkbenchPage({ browser });

  return { browser, page, process: vscodeProcess, tmpRoot, userDataDir };
}
