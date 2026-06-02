import fs from 'node:fs';
import path from 'node:path';

import { safeMkdir } from '../../core/entities/storage/storage';
import { sanitizeLogDetails } from './sanitizeLogDetails';

/**
 * Что это: файловый logger daemon с безопасной записью JSON-lines.
 * Зачем нужно: daemon работает в фоне, и пользователю/QA нужен trace ошибок без падения процесса.
 * Какую продуктовую проблему решает: диагностика доступна в workspace .aist, но секреты маскируются.
 */
export class DaemonFileLogger {
  constructor(private readonly filePath: string) {}

  info(message: string, details?: unknown): void {
    void this.write('info', message, details);
  }

  warn(message: string, details?: unknown): void {
    void this.write('warn', message, details);
  }

  error(message: string, details?: unknown): void {
    void this.write('error', message, details);
  }

  private async write(level: string, message: string, details?: unknown): Promise<void> {
    const line = JSON.stringify({
      at: new Date().toISOString(),
      level,
      message,
      details: sanitizeLogDetails({ value: details })
    });
    await safeMkdir(path.dirname(this.filePath)).catch(() => undefined);
    await fs.promises.appendFile(this.filePath, `${line}\n`, 'utf8').catch(() => undefined);
  }
}
