import { ConfigStoreLogger } from './ConfigStoreLogger';

export type FileBackedConfigStoreOptions = {
  workspaceRoot?: string;
  homeDir?: string;
  logger?: ConfigStoreLogger;
  workspaceSecretKeys?: readonly string[];
};
