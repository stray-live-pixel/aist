import { CodexStreamEvent } from './CodexStreamEvent';

export function parseSseEvent(chunk: string): CodexStreamEvent | undefined {
  const eventName = chunk
    .split(/\r?\n/)
    .find((line) => line.startsWith('event:'))
    ?.slice('event:'.length)
    .trim();
  const data = chunk
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice('data:'.length).trimStart())
    .join('\n')
    .trim();

  if (!data || data === '[DONE]') {
    return undefined;
  }

  try {
    const event = JSON.parse(data) as CodexStreamEvent;
    return event.type || !eventName ? event : { ...event, type: eventName };
  } catch {
    return undefined;
  }
}
