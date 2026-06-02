export type StorageErrorCode =
  | 'storage.invalidPath'
  | 'storage.pathTraversal'
  | 'storage.serializationFailed'
  | 'storage.mkdirFailed'
  | 'storage.writeFailed'
  | 'storage.appendFailed';
