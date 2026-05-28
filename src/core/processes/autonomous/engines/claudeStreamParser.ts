import { createAutonomousEvent } from '../storage/sessionStore';
import type { AutonomousEvent } from '../types';

export type ClaudeParsedLine = {
  events: AutonomousEvent[];
  contentDelta?: string;
  sessionRef?: string;
};

/**
 * Маппит stream-json Claude Code в нейтральные autonomous events. Формат CLI
 * менялся между версиями, поэтому parser допускает несколько известных полей и
 * не падает на неизвестных событиях — raw line остаётся в EVENT.
 */
export function parseClaudeStreamLine(line: string, stageIndex?: number): ClaudeParsedLine {
  const parsed = safeParse(line);
  if (!parsed) {
    return { events: [createAutonomousEvent('EVENT', line, { stageIndex })] };
  }

  const type = asString(parsed.type) || asString(parsed.event) || 'event';
  const message = getClaudeText(parsed) || type;
  const sessionRef = asString(parsed.session_id) || asString(parsed.sessionId);
  const action = type.includes('thinking') ? 'THINKING' : type.includes('result') ? 'RESULT' : 'ASSISTANT';

  return {
    events: [createAutonomousEvent(action, message, { stageIndex, data: { raw: parsed } })],
    contentDelta: action === 'ASSISTANT' ? message : undefined,
    sessionRef
  };
}

function getClaudeText(value: Record<string, unknown>): string | undefined {
  const direct = asString(value.content) || asString(value.text) || asString(value.result);
  if (direct) {
    return direct;
  }

  const message = value.message;
  if (isRecord(message)) {
    return asString(message.content) || asString(message.text);
  }

  return undefined;
}

function safeParse(line: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(line) as unknown;
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}
