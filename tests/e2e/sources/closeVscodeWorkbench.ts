import fs from 'node:fs/promises';

import { killProcessesByCommandMarker } from '../utils/killProcessesByCommandMarker';
import { stopProcess } from '../utils/stopProcess';
import { waitForProcessExit } from '../utils/waitForProcessExit';
import type { VscodeWorkbenchSession } from './VscodeWorkbenchSession';
import { closeWorkbenchWindow } from './closeWorkbenchWindow';

/**
 * Что это: закрывает e2e-сессию VS Code и удаляет временный workspace.
 * Зачем нужно: после каждого worker не должно оставаться окон VS Code, временных extensions-dir и user-data-dir.
 */
export async function closeVscodeWorkbench({
  session
}: {
  session: VscodeWorkbenchSession | undefined;
}): Promise<void> {
  if (!session) {
    return;
  }

  await closeWorkbenchWindow({ page: session.page });
  await session.browser.close().catch(() => undefined);

  const exitedAfterWindowClose = await waitForProcessExit({ process: session.process });
  if (!exitedAfterWindowClose) {
    stopProcess({ process: session.process });
    await waitForProcessExit({ process: session.process, timeout: 2_000 });
  }

  await killProcessesByCommandMarker({ marker: session.userDataDir });
  await fs.rm(session.tmpRoot, { recursive: true, force: true }).catch(() => undefined);
}
