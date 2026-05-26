import { spawn } from 'node:child_process';

export type CliRunOptions = {
  command: string;
  args: string[];
  cwd: string;
  input: string;
  signal: AbortSignal;
  onStdoutLine(line: string): void;
  onStderrLine(line: string): void;
};

/**
 * Запускает внешний CLI напрямую через argv-массив. Shell намеренно не
 * используется: так prompt не интерпретируется оболочкой, а command builder можно
 * тестировать как чистую функцию.
 */
export async function runCliProcess(options: CliRunOptions): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const childProcess = spawn(options.command, options.args, {
      cwd: options.cwd,
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
      signal: options.signal
    });
    let stdoutBuffer = '';
    let stderrBuffer = '';

    childProcess.stdout.on('data', (chunk: Buffer) => {
      stdoutBuffer = emitLines(`${stdoutBuffer}${chunk.toString('utf8')}`, options.onStdoutLine);
    });
    childProcess.stderr.on('data', (chunk: Buffer) => {
      stderrBuffer = emitLines(`${stderrBuffer}${chunk.toString('utf8')}`, options.onStderrLine);
    });
    childProcess.once('error', reject);
    childProcess.once('close', (exitCode) => {
      if (stdoutBuffer.trim()) {
        options.onStdoutLine(stdoutBuffer.trim());
      }
      if (stderrBuffer.trim()) {
        options.onStderrLine(stderrBuffer.trim());
      }
      if (exitCode === 0 || options.signal.aborted) {
        resolve();
      } else {
        reject(new Error(`${options.command} exited with code ${exitCode ?? 'unknown'}.`));
      }
    });

    childProcess.stdin.end(options.input);
  });
}

function emitLines(buffer: string, onLine: (line: string) => void): string {
  const lines = buffer.split(/\r?\n/);
  const rest = lines.pop() || '';
  for (const line of lines) {
    if (line.trim()) {
      onLine(line);
    }
  }
  return rest;
}
