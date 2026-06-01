import { type AutonomousFlowDefinition } from '../types';
import { DefinitionSource } from './DefinitionSource';
import { readFlowDefinition } from './readFlowDefinition';
import { safeReadDirectories } from './safeReadDirectories';

export async function discoverFlows(source: DefinitionSource): Promise<AutonomousFlowDefinition[]> {
  const entries = await safeReadDirectories(source.flowsRoot);
  return Promise.all(entries.map((entry) => readFlowDefinition(source, entry)));
}
