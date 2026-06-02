import {
  type AutonomousDefinitionDiagnostic,
  type AutonomousDefinitions,
  type AutonomousFlowDefinition,
  type AutonomousRunDefinition
} from '../types';
import { AutonomousDiscoveryOptions } from './AutonomousDiscoveryOptions';
import { createDefinitionSources } from './createDefinitionSources';
import { discoverFlows } from './discoverFlows';
import { discoverRuns } from './discoverRuns';
import { preferNativeDefinitions } from './preferNativeDefinitions';
import { toDiagnostic } from './toDiagnostic';

export async function discoverAutonomousDefinitions(
  options: AutonomousDiscoveryOptions
): Promise<AutonomousDefinitions> {
  const sources = createDefinitionSources(options);
  const flows: AutonomousFlowDefinition[] = [];
  const runs: AutonomousRunDefinition[] = [];
  const diagnostics: AutonomousDefinitionDiagnostic[] = [];

  for (const source of sources) {
    const [sourceFlows, sourceRuns] = await Promise.all([
      discoverFlows(source).catch((error: unknown) => {
        diagnostics.push(toDiagnostic('source.notFound', error, source.flowsRoot));
        return [];
      }),
      discoverRuns(source).catch((error: unknown) => {
        diagnostics.push(toDiagnostic('source.notFound', error, source.runsRoot));
        return [];
      })
    ]);
    flows.push(...sourceFlows);
    runs.push(...sourceRuns);
  }

  return { flows: preferNativeDefinitions(flows), runs: preferNativeDefinitions(runs), diagnostics };
}
