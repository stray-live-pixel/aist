import { createAutonomousEvent } from '../storage/sessionStore';
import type { AutonomousEvent } from '../types';

export type CodexParsedLine = {
  events: AutonomousEvent[];
  contentDelta?: string;
  sessionRef?: string;
};

/**
 * Разбирает JSON lines `codex exec --json`. Parser терпим к разным версиям CLI:
 * основной инвариант для orchestrator — извлечь текст, ошибки и session/thread id,
 * а неизвестное оставить как EVENT с raw payload.
 */
export function parseCodexStreamLine(line: string, stageIndex?: number): CodexParsedLine {
  const parsed = safeParse(line);
  if (!parsed) {
    return { events: [createAutonomousEvent('EVENT', line, { stageIndex })] };
  }

  const type = asString(parsed.type) || asString(parsed.event) || 'event';
  const sessionRef = asString(parsed.session_id) || asString(parsed.sessionId) || asString(parsed.thread_id);
  const text =
    asString(parsed.delta) || asString(parsed.text) || asString(parsed.message) || asString(parsed.output) || type;

  if (type.includes('error')) {
    return {
      events: [createAutonomousEvent('ERROR', text, { level: 'error', stageIndex, data: { raw: parsed } })],
      sessionRef
    };
  }

  const action =
    type.includes('reasoning') || type.includes('thinking')
      ? 'THINKING'
      : type.includes('result')
        ? 'RESULT'
        : 'ASSISTANT';
  return {
    events: [createAutonomousEvent(action, text, { stageIndex, data: { raw: parsed } })],
    contentDelta: action === 'ASSISTANT' ? text : undefined,
    sessionRef
  };
}

function safeParse(line: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(line) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}
