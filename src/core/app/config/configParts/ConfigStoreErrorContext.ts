import { ConfigScope } from './ConfigScope';

export type ConfigStoreErrorContext = {
  key?: string;
  filePath?: string;
  scope?: ConfigScope;
  cause?: unknown;
};
