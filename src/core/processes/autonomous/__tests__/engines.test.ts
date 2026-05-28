import { describe, expect, it } from 'vitest';

import { buildClaudeCliArgs } from '../engines/claudeCliEngine';
import { parseClaudeStreamLine } from '../engines/claudeStreamParser';
import { buildCodexCliArgs } from '../engines/codexCliEngine';
import { parseCodexStreamLine } from '../engines/codexStreamParser';
import { createAutonomousEngineRegistry } from '../engines/registry';
import type { AutonomousEvent } from '../types';

describe('autonomous CLI engines', () => {
  it('builds CLI argv without shell strings', () => {
    expect(buildClaudeCliArgs('session-1')).toContain('--resume');
    expect(buildClaudeCliArgs('session-1')).toContain('session-1');
    expect(buildCodexCliArgs('gpt-5.1-codex')).toEqual([
      'exec',
      '--json',
      '--dangerously-bypass-approvals-and-sandbox',
      '--model',
      'gpt-5.1-codex'
    ]);
  });

  it('parses Claude and Codex JSON stream lines', () => {
    const claude = parseClaudeStreamLine(JSON.stringify({ type: 'assistant', content: 'hello', session_id: 'c1' }), 1);
    const codex = parseCodexStreamLine(
      JSON.stringify({ type: 'response.output_text.delta', delta: 'world', thread_id: 't1' }),
      2
    );

    expect(claude.contentDelta).toBe('hello');
    expect(claude.sessionRef).toBe('c1');
    expect(codex.contentDelta).toBe('world');
    expect(codex.sessionRef).toBe('t1');
  });

  it('uses injected core model clients for API engines', async () => {
    const seenModels: Array<string | undefined> = [];
    const events: AutonomousEvent[] = [];
    const registry = createAutonomousEngineRegistry({
      openRouterClient: {
        chat: async (_messages, _tools, model, _signal, stream) => {
          seenModels.push(model);
          stream?.onContentDelta?.('streamed ');
          stream?.onComplete?.();
          return { role: 'assistant', content: 'final answer' };
        }
      }
    });

    const result = await registry.get('openrouter-api').run({
      prompt: 'Hello',
      model: 'openrouter/test',
      workDir: process.cwd(),
      signal: new AbortController().signal,
      onEvent: (event) => {
        events.push(event);
      }
    });

    expect(result.result).toBe('final answer');
    expect(seenModels).toEqual(['openrouter/test']);
    expect(events.map((event) => event.action)).toEqual(['ASSISTANT', 'DONE']);
  });
});
