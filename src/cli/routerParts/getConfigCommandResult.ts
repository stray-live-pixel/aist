import { CliCommand } from './CliCommand';
import { ConfigGetResult } from './ConfigGetResult';
import { ConfigValueSource } from './ConfigValueSource';
import { RunCliOptions } from './RunCliOptions';
import { asJsonObject } from './asJsonObject';
import { getJsonPath } from './getJsonPath';
import { mergeJsonObjects } from './mergeJsonObjects';
import { readOptionalJsonObject } from './readOptionalJsonObject';
import { redactConfigValue } from './redactConfigValue';
import { resolveCliPaths } from './resolveCliPaths';

export async function getConfigCommandResult(
  command: Extract<CliCommand, { kind: 'configGet' }>,
  options: RunCliOptions
): Promise<ConfigGetResult> {
  const paths = resolveCliPaths({ ...options, workspace: command.workspace });
  const globalSettings = await readOptionalJsonObject(paths.globalSettingsFile);
  const workspaceSettings = await readOptionalJsonObject(paths.workspaceSettingsFile);

  if (command.key) {
    const workspaceValue = getJsonPath(workspaceSettings, command.key);
    const globalValue = getJsonPath(globalSettings, command.key);
    const value = workspaceValue !== undefined ? workspaceValue : globalValue;
    const source: ConfigValueSource =
      workspaceValue !== undefined ? 'workspace' : globalValue !== undefined ? 'global' : 'unset';
    const redacted = redactConfigValue(command.key, value);
    return {
      key: command.key,
      value: redacted.value,
      source,
      redacted: redacted.redacted
    };
  }

  const merged = mergeJsonObjects(globalSettings, workspaceSettings);
  const redacted = redactConfigValue('', merged);
  return {
    values: asJsonObject(redacted.value),
    redacted: redacted.redacted
  };
}
