export type ConfigStoreErrorCode =
  | 'config.invalidKey'
  | 'config.invalidJson'
  | 'config.readFailed'
  | 'config.writeFailed'
  | 'config.workspaceSecretRejected'
  | 'secret.invalidKey'
  | 'secret.invalidValue'
  | 'secret.invalidJson'
  | 'secret.readFailed'
  | 'secret.writeFailed'
  | 'secret.deleteFailed';
