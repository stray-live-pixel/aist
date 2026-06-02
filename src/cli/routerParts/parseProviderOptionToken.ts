import { CliModelProvider } from './CliModelProvider';
import { parseCliModelProvider } from './parseCliModelProvider';

export function parseProviderOptionToken(
  command: string,
  args: readonly string[],
  index: number,
  current: CliModelProvider
): { readonly matched: boolean; readonly provider: CliModelProvider; readonly index: number } {
  const token = args[index];

  if (token === '--provider') {
    const value = args[index + 1];
    return { matched: true, provider: parseCliModelProvider(command, value), index: index + 1 };
  }

  if (token.startsWith('--provider=')) {
    return { matched: true, provider: parseCliModelProvider(command, token.slice('--provider='.length)), index };
  }

  return { matched: false, provider: current, index };
}
