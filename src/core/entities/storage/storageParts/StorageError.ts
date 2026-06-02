import { StorageErrorCode } from './StorageErrorCode';
import { StorageErrorContext } from './StorageErrorContext';

export class StorageError extends Error {
  readonly code: StorageErrorCode;
  readonly filePath?: string;
  readonly rootPath?: string;
  readonly inputPath?: string;
  readonly cause?: unknown;

  constructor(code: StorageErrorCode, message: string, context: StorageErrorContext = {}) {
    super(message);
    this.name = 'StorageError';
    this.code = code;
    this.filePath = context.filePath;
    this.rootPath = context.rootPath;
    this.inputPath = context.inputPath;
    this.cause = context.cause;
  }

  toJSON(): StorageErrorContext & { name: string; message: string; code: StorageErrorCode } {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      filePath: this.filePath,
      rootPath: this.rootPath,
      inputPath: this.inputPath
    };
  }
}
