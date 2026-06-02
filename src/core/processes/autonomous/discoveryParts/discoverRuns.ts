import { type AutonomousRunDefinition } from '../types';
import { DefinitionSource } from './DefinitionSource';
import { readRunDefinition } from './readRunDefinition';
import { safeReadDirectories } from './safeReadDirectories';

export async function discoverRuns(source: DefinitionSource): Promise<AutonomousRunDefinition[]> {
  const entries = await safeReadDirectories(source.runsRoot);
  return Promise.all(entries.map((entry) => readRunDefinition(source, entry)));
}
