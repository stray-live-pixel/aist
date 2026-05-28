import { createAutonomousEvent } from '../storage/sessionStore';
import { runCliProcess } from './cliProcess';
import { parseCodexStreamLine } from './codexStreamParser';
import type { AutonomousEngine } from './types';

export function buildCodexCliArgs(model?: string): string[] {
  return ['exec', '--json', '--dangerously-bypass-approvals-and-sandbox', ...(model ? ['--model', model] : [])];
}

/**
 * Adapter OpenAI Codex CLI. Python discovery/fork logic из prompt не переносится;
 * CLI запускается напрямую, stderr пишется events artifact stream, а session id
 * извлекается из JSON events при наличии.
 */
export function createCodexCliEngine(): AutonomousEngine {
  return {
    id: 'codex-cli',
    label: 'OpenAI Codex CLI',
    capabilities: { resume: false, fork: false, tools: true, requiresBinary: 'codex' },
    async run(request) {
      const content: string[] = [];
      let sessionRef = request.sessionRef;
      await request.onEvent(createAutonomousEvent('SYS', 'Starting Codex CLI.', { stageIndex: request.stageIndex }));
      await runCliProcess({
        command: 'codex',
        args: buildCodexCliArgs(request.model),
        cwd: request.workDir,
        input: request.prompt,
        signal: request.signal,
        onStdoutLine(line) {
          const parsed = parseCodexStreamLine(line, request.stageIndex);
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
