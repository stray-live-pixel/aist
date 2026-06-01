import { CliWriter } from './CliWriter';
import { RunCliOptions } from './RunCliOptions';
import { readStreamText } from './readStreamText';

export async function readOpenRouterKeyFromStdin(options: RunCliOptions, stderr: CliWriter): Promise<string> {
  const stdin = options.stdin || process.stdin;
  if ('isTTY' in stdin && stdin.isTTY) {
    stderr('Enter OpenRouter API key, then press Enter:\n');
  }

  return readStreamText(stdin);
}
