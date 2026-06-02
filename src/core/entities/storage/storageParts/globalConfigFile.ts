import { globalSettingsFile } from './globalSettingsFile';

export function globalConfigFile(homeDir?: string): string {
  return globalSettingsFile(homeDir);
}
