import { type JsonValue } from '../../../shared/types/types';

export type ResolveConfigValueOptions<T extends JsonValue> = {
  env?: Record<string, string | undefined>;
  envKey?: string;
  defaultValue?: T;
  parseEnv?: (value: string) => T | undefined;
};
