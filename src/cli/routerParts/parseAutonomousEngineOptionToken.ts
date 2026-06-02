import { type AutonomousEngineId } from '../../core/processes/autonomous';
import { parseAutonomousEngineId } from './parseAutonomousEngineId';

export function parseAutonomousEngineOptionToken(
  command: string,
  args: readonly string[],
  index: number,
  current: AutonomousEngineId
): { readonly matched: boolean; readonly engineId: AutonomousEngineId; readonly index: number } {
  const token = args[index];

  if (token === '--engine') {
    const value = args[index + 1];
    return { matched: true, engineId: parseAutonomousEngineId(command, value), index: index + 1 };
  }

  if (token.startsWith('--engine=')) {
    return {
      matched: true,
      engineId: parseAutonomousEngineId(command, token.slice('--engine='.length)),
      index
    };
  }

  return { matched: false, engineId: current, index };
}
