import { createAutonomousEvent } from '../storage/sessionStore';
import { parseClaudeStreamLine } from './claudeStreamParser';
import { runCliProcess } from './cliProcess';
import type { AutonomousEngine } from './types';

export function buildClaudeCliArgs(sessionRef?: string): string[] {
  return [
    ...(sessionRef ? ['--resume', sessionRef] : []),
    '--permission-mode',
    'bypassPermissions',
    '--output-format',
    'stream-json',
    '--allowedTools',
    'Bash,Edit,MultiEdit,Read,Write,Glob,Grep,LS'
  ];
}

/**
 * Adapter Claude Code CLI. Он заменяет legacy shell wrapper, но сохраняет важное
 * поведение: bypass permissions, stream-json и session id capture.
 */
export function createClaudeCliEngine(): AutonomousEngine {
  return {
    id: 'claude-cli',
    label: 'Claude Code CLI',
    capabilities: { resume: true, fork: false, tools: true, requiresBinary: 'claude' },
    async run(request) {
      const content: string[] = [];
      let sessionRef = request.sessionRef;
      await request.onEvent(
        createAutonomousEvent('SYS', 'Starting Claude Code CLI.', { stageIndex: request.stageIndex })
      );
      await runCliProcess({
        command: 'claude',
        args: buildClaudeCliArgs(request.sessionRef),
        cwd: request.workDir,
        input: request.prompt,
        signal: request.signal,
        onStdoutLine(line) {
          const parsed = parseClaudeStreamLine(line, request.stageIndex);
          if (parsed.contentDelta) {
            content.push(parsed.contentDelta);
          }
          if (parsed.sessionRef) {
            sessionRef = parsed.sessionRef;
          }
          for (const event of parsed.events) {
            void request.onEvent(event);
          }
        },
        onStderrLine(line) {
          void request.onEvent(
            createAutonomousEvent('BASH', line, { level: 'warning', stageIndex: request.stageIndex })
          );
        }
      });

      return { result: content.join('\n').trim(), sessionRef };
    }
  };
}
