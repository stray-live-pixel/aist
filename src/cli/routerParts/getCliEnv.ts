import { RunCliOptions } from './RunCliOptions';

export function getCliEnv(options: RunCliOptions): Record<string, string | undefined> {
  return options.env || process.env;
}
