import { type JsonObject } from '../../core/shared/types/types';

export class CliCommandError extends Error {
  readonly exitCode: number;
  readonly code: string;
  readonly details?: JsonObject;

  constructor(code: string, message: string, options: { exitCode?: number; details?: JsonObject } = {}) {
    super(message);
    this.name = 'CliCommandError';
    this.code = code;
    this.exitCode = options.exitCode ?? 1;
    this.details = options.details;
  }
}
