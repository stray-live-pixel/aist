import { CliCommand } from './CliCommand';
import { CliWriter } from './CliWriter';
import { RunCliOptions } from './RunCliOptions';
import { formatModelsListOutput } from './formatModelsListOutput';
import { getModelsList } from './getModelsList';

export async function runModelsCommand(
  command: Extract<CliCommand, { kind: `models${string}` }>,
  options: RunCliOptions,
  stdout: CliWriter
): Promise<number> {
  const result = await getModelsList(command.provider, options, command.kind === 'modelsRefresh');
  stdout(formatModelsListOutput(result, command.json));
  return 0;
}
