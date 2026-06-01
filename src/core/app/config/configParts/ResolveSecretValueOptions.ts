export type ResolveSecretValueOptions = {
  env?: Record<string, string | undefined>;
  envKey?: string;
  defaultValue?: string;
};
