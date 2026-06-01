import { ConfigScope } from './ConfigScope';
import { ConfigStoreErrorCode } from './ConfigStoreErrorCode';
import { ConfigStoreErrorContext } from './ConfigStoreErrorContext';

export class ConfigStoreError extends Error {
  readonly code: ConfigStoreErrorCode;
  readonly key?: string;
  readonly filePath?: string;
  readonly scope?: ConfigScope;
  readonly cause?: unknown;

  constructor(code: ConfigStoreErrorCode, message: string, context: ConfigStoreErrorContext = {}) {
    super(message);
    this.name = 'ConfigStoreError';
    this.code = code;
    this.key = context.key;
    this.filePath = context.filePath;
    this.scope = context.scope;
    this.cause = context.cause;
  }

  toJSON(): ConfigStoreErrorContext & { name: string; message: string; code: ConfigStoreErrorCode } {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      key: this.key,
      filePath: this.filePath,
      scope: this.scope
    };
  }
}
