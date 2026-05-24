import { type Browser, type Frame, type Page, test as base, chromium, expect } from '@playwright/test';
import { downloadAndUnzipVSCode, resolveCliArgsFromVSCodeExecutablePath } from '@vscode/test-electron';
import { type ChildProcess, spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import net, { type AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';

type WorkerFixtures = {
  workbench: Page;
};

const extensionPath = path.resolve(__dirname, '../..');

export const test = base.extend<{}, WorkerFixtures>({
  workbench: [
    async ({}, use) => {
      const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'aist-e2e-'));
      const workspacePath = path.join(tmpRoot, 'workspace');
      const userDataDir = path.join(tmpRoot, 'user-data');
      const extensionsDir = path.join(tmpRoot, 'extensions');
      const remoteDebuggingPort = await getFreePort();

      await fs.mkdir(workspacePath, { recursive: true });
      await fs.writeFile(path.join(workspacePath, 'README.md'), '# E2E workspace\n', 'utf8');

      const vscodeExecutablePath =
        process.env.VSCODE_E2E_PATH ||
        (await downloadAndUnzipVSCode({
          version: process.env.VSCODE_E2E_VERSION || 'stable',
          extensionDevelopmentPath: extensionPath
        }));

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
            VSCODE_E2E: '1'
          },
          shell: process.platform === 'win32',
          stdio: ['ignore', 'pipe', 'pipe']
        }
      );

      let browser: Browser | undefined;
      const logs = collectProcessLogs(vscodeProcess);

      try {
        await waitForCdp(remoteDebuggingPort, vscodeProcess, logs);
        browser = await chromium.connectOverCDP(`http://127.0.0.1:${remoteDebuggingPort}`);

        const page = await waitForWorkbenchPage(browser);
        await use(page);
      } finally {
        await browser?.close().catch(() => undefined);
        stopProcess(vscodeProcess);
        await fs.rm(tmpRoot, { recursive: true, force: true }).catch(() => undefined);
      }
    },
    { scope: 'worker', timeout: 120_000 }
  ]
});

export { expect };

export async function runCommand(page: Page, commandTitle: string): Promise<void> {
  const shortcut = process.platform === 'darwin' ? 'Meta+Shift+P' : 'Control+Shift+P';

  await page.keyboard.press(shortcut);

  const commandInput = page.locator('.quick-input-widget input').first();
  await expect(commandInput).toBeVisible();
  await commandInput.fill(`>${commandTitle}`);
  await page.keyboard.press('Enter');
  await expect(commandInput).toBeHidden({ timeout: 15_000 });
}

export async function findFrameByText(page: Page, text: string, timeout = 60_000): Promise<Frame> {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    for (const frame of page.frames()) {
      if (frame.isDetached()) {
        continue;
      }

      const match = frame.getByText(text, { exact: true }).first();
      if ((await match.count().catch(() => 0)) > 0 && (await match.isVisible().catch(() => false))) {
        return frame;
      }
    }

    await page.waitForTimeout(250);
  }

  throw new Error(`Could not find a frame containing text: ${text}`);
}

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as AddressInfo;
      server.close(() => resolve(address.port));
    });
  });
}

function collectProcessLogs(process: ChildProcess): () => string {
  let output = '';

  process.stdout?.on('data', (chunk: Buffer) => {
    output += chunk.toString();
  });
  process.stderr?.on('data', (chunk: Buffer) => {
    output += chunk.toString();
  });

  return () => output.trim();
}

async function waitForCdp(port: number, process: ChildProcess, logs: () => string, timeout = 60_000): Promise<void> {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    if (process.exitCode !== null) {
      throw new Error(`VS Code exited before CDP was ready.\n${logs()}`);
    }

    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) {
        return;
      }
    } catch {
      // VS Code has not opened the debugging endpoint yet.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Timed out waiting for VS Code CDP on port ${port}.\n${logs()}`);
}

async function waitForWorkbenchPage(browser: Browser, timeout = 60_000): Promise<Page> {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    for (const context of browser.contexts()) {
      for (const page of context.pages()) {
        if (page.isClosed()) {
          continue;
        }

        if (
          (await page
            .locator('.monaco-workbench')
            .count()
            .catch(() => 0)) > 0
        ) {
          await page.locator('.monaco-workbench').waitFor({ state: 'visible', timeout: 10_000 });
          return page;
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error('Timed out waiting for the VS Code workbench page.');
}

function stopProcess(process: ChildProcess): void {
  if (process.exitCode !== null || process.killed) {
    return;
  }

  process.kill('SIGTERM');
}
