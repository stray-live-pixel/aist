import path from 'node:path';

import { AUTONOMOUS_ROOT_RELATIVE_PATH } from './AUTONOMOUS_ROOT_RELATIVE_PATH';
import { copyDirectory } from './copyDirectory';

export async function importLegacyDefinitions(workspaceRoot: string): Promise<void> {
  const legacyRoot = path.join(workspaceRoot, 'prompt');
  const nativeRoot = path.join(workspaceRoot, AUTONOMOUS_ROOT_RELATIVE_PATH);
  await copyDirectory(path.join(legacyRoot, 'flows'), path.join(nativeRoot, 'flows'));
  await copyDirectory(path.join(legacyRoot, 'runs'), path.join(nativeRoot, 'runs'));
}
