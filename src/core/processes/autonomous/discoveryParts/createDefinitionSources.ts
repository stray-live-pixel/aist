import path from 'node:path';

import { AUTONOMOUS_ROOT_RELATIVE_PATH } from './AUTONOMOUS_ROOT_RELATIVE_PATH';
import { AutonomousDiscoveryOptions } from './AutonomousDiscoveryOptions';
import { DefinitionSource } from './DefinitionSource';

export function createDefinitionSources(options: AutonomousDiscoveryOptions): DefinitionSource[] {
  const nativeRoot = path.join(options.workspaceRoot, AUTONOMOUS_ROOT_RELATIVE_PATH);
  const sources: DefinitionSource[] = [
    { kind: 'native', flowsRoot: path.join(nativeRoot, 'flows'), runsRoot: path.join(nativeRoot, 'runs') }
  ];

  if (options.includeLegacyPrompt === true) {
    const legacyRoot = path.join(options.workspaceRoot, 'prompt');
    sources.push({
      kind: 'legacy',
      flowsRoot: path.join(legacyRoot, 'flows'),
      runsRoot: path.join(legacyRoot, 'runs')
    });
  }

  return sources;
}
