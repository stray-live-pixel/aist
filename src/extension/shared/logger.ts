import * as vscode from 'vscode';
import { getErrorMessage } from './errors';

export type AistLogger = vscode.Disposable & {
  info(message: string, details?: unknown): void;
  error(message: string, error?: unknown): void;
  show(): void;
};

export function createLogger(): AistLogger {
  const output = vscode.window.createOutputChannel('aist');

  return {
    info(message, details) {
      write(output, 'info', message, details);
    },
    error(message, error) {
      write(output, 'error', message, error);
    },
    show() {
      output.show(true);
    },
    dispose() {
      output.dispose();
    }
  };
}

function write(output: vscode.OutputChannel, level: 'info' | 'error', message: string, details?: unknown): void {
  const formattedDetails = formatDetails(details);
  const line = `[${new Date().toISOString()}] [${level}] ${message}${formattedDetails ? ` ${formattedDetails}` : ''}`;

  output.appendLine(line);

  if (level === 'error') {
    console.error(`[aist] ${message}`, details ?? '');
  } else {
    console.log(`[aist] ${message}`, details ?? '');
  }
}

function formatDetails(details: unknown): string {
  if (details === undefined) {
    return '';
  }

  if (details instanceof Error) {
    return getErrorMessage(details);
  }

  if (typeof details === 'string') {
    return details;
  }

  try {
    return JSON.stringify(details);
  } catch {
    return String(details);
  }
}
