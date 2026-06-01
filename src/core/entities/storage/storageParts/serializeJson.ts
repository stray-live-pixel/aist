import { StorageError } from './StorageError';

export function serializeJson(value: unknown, spaces?: number): string {
  try {
    const serialized = spaces === undefined ? JSON.stringify(value) : JSON.stringify(value, null, spaces);
    if (serialized === undefined) {
      throw new Error('JSON.stringify returned undefined.');
    }
    return serialized;
  } catch (cause) {
    if (cause instanceof StorageError) {
      throw cause;
    }

    throw new StorageError('storage.serializationFailed', 'Storage value is not JSON-serializable.', { cause });
  }
}
