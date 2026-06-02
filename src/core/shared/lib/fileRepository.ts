import fs from 'node:fs';
import path from 'node:path';

export type FileRepositoryErrorCode =
  | 'repository.invalidId'
  | 'repository.conflict'
  | 'repository.invalidJson'
  | 'repository.invalidJsonl'
  | 'repository.readFailed';

export type FileRepositoryErrorContext = {
  filePath?: string;
  id?: string;
  cause?: unknown;
};

export class FileRepositoryError extends Error {
  readonly code: FileRepositoryErrorCode;
  readonly filePath?: string;
  readonly id?: string;
  readonly cause?: unknown;

  constructor(code: FileRepositoryErrorCode, message: string, context: FileRepositoryErrorContext = {}) {
    super(message);
    this.name = 'FileRepositoryError';
    this.code = code;
    this.filePath = context.filePath;
    this.id = context.id;
    this.cause = context.cause;
  }

  toJSON(): FileRepositoryErrorContext & { name: string; message: string; code: FileRepositoryErrorCode } {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      filePath: this.filePath,
      id: this.id
    };
  }
}

/**
 * ID становится частью пути внутри `.aist-agent`, поэтому запрещаем любые
 * разделители, `.`/`..` и control/null bytes. UUID остаётся основным форматом,
 * но тестовые и будущие CLI ids могут быть человекочитаемыми.
 */
export function assertRepositoryId(id: string, label: string): string {
  if (typeof id !== 'string' || id.trim() === '') {
    throw new FileRepositoryError('repository.invalidId', `${label} id must be a non-empty string.`, {
      id: String(id)
    });
  }

  if (
    id === '.' ||
    id === '..' ||
    id.includes('\0') ||
    id.includes('/') ||
    id.includes('\\') ||
    hasControlCharacter({ value: id })
  ) {
    throw new FileRepositoryError('repository.invalidId', `${label} id is not safe for file storage paths.`, { id });
  }

  return id;
}

export async function readJsonFile<T>(filePath: string): Promise<T | undefined> {
  let raw: string;

  try {
    raw = await fs.promises.readFile(filePath, 'utf8');
  } catch (cause) {
    if (isMissingFileError(cause)) {
      return undefined;
    }

    throw new FileRepositoryError('repository.readFailed', `Failed to read JSON file: ${filePath}`, {
      filePath,
      cause
    });
  }

  try {
    return JSON.parse(raw) as T;
  } catch (cause) {
    throw new FileRepositoryError('repository.invalidJson', `Storage JSON file is invalid: ${filePath}`, {
      filePath,
      cause
    });
  }
}

export async function readJsonlFile<T>(filePath: string): Promise<T[]> {
  let raw: string;

  try {
    raw = await fs.promises.readFile(filePath, 'utf8');
  } catch (cause) {
    if (isMissingFileError(cause)) {
      return [];
    }

    throw new FileRepositoryError('repository.readFailed', `Failed to read JSONL file: ${filePath}`, {
      filePath,
      cause
    });
  }

  const entries: T[] = [];
  const lines = raw.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) {
      continue;
    }

    try {
      entries.push(JSON.parse(line) as T);
    } catch (cause) {
      throw new FileRepositoryError(
        'repository.invalidJsonl',
        `Storage JSONL file has an invalid line ${index + 1}: ${filePath}`,
        { filePath, cause }
      );
    }
  }

  return entries;
}

export async function listDirectoryNames(rootPath: string): Promise<string[]> {
  let entries: fs.Dirent[];

  try {
    entries = await fs.promises.readdir(rootPath, { withFileTypes: true });
  } catch (cause) {
    if (isMissingFileError(cause)) {
      return [];
    }

    throw new FileRepositoryError('repository.readFailed', `Failed to list storage directory: ${rootPath}`, {
      filePath: rootPath,
      cause
    });
  }

  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function removeUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

export function sortByUpdatedAtDesc<T extends { updatedAt: number; createdAt?: number; id: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    const byUpdatedAt = right.updatedAt - left.updatedAt;
    const byCreatedAt = (right.createdAt || 0) - (left.createdAt || 0);
    return byUpdatedAt || byCreatedAt || left.id.localeCompare(right.id);
  });
}

export function childPath(rootPath: string, id: string, fileName?: string): string {
  return fileName ? path.join(rootPath, id, fileName) : path.join(rootPath, id);
}

/**
 * Что это: проверяет, есть ли в id управляющие символы ASCII.
 * Зачем нужно: такие символы невидимы в UI и опасны как часть пути хранения.
 * Какую продуктовую проблему решает: repository id остаётся безопасным и понятным для диагностики.
 */
function hasControlCharacter({ value }: { value: string }): boolean {
  return [...value].some((character) => character.charCodeAt(0) <= 31);
}

function isMissingFileError(cause: unknown): boolean {
  return Boolean(cause && typeof cause === 'object' && 'code' in cause && cause.code === 'ENOENT');
}
