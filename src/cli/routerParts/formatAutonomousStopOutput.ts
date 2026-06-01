import { AutonomousStopCommandResult } from './AutonomousStopCommandResult';
import { formatJsonOutput } from './formatJsonOutput';

export function formatAutonomousStopOutput(result: AutonomousStopCommandResult, json: boolean): string {
  if (json) {
    return formatJsonOutput(result);
  }

  return result.stopped
    ? `Stopped autonomous session ${result.sessionId}.\n`
    : `Autonomous session ${result.sessionId} was not running.\n`;
}
