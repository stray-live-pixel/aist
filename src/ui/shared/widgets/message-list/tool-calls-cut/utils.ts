import type { ChatMessage } from '../../../shared/types';

/**
 * Что это: компактная строка метаданных для группы tool-call.
 * Зачем нужно: закрытый cut должен объяснять, сколько инструментов скрыто и сколько занял цикл.
 */
export function formatToolCallsMeta(
  tools: ChatMessage[],
  userMessage?: ChatMessage,
  assistantMessage?: ChatMessage
): string {
  const countLabel = `${tools.length} ${tools.length === 1 ? 'tool' : 'tools'}`;
  const durationLabel = formatToolCallsDuration(userMessage, assistantMessage);

  return durationLabel ? `${countLabel} · ${durationLabel}` : countLabel;
}

/**
 * Что это: длительность между пользовательским сообщением и ответом ассистента.
 * Зачем нужно: если одного из краёв нет, показывать длительность нельзя — иначе UI будет вводить в заблуждение.
 */
export function formatToolCallsDuration(userMessage?: ChatMessage, assistantMessage?: ChatMessage): string | undefined {
  if (!userMessage || !assistantMessage) {
    return undefined;
  }

  const durationMs = Math.max(0, assistantMessage.createdAt - userMessage.createdAt);
  return formatDuration(durationMs);
}

/**
 * Что это: человекочитаемое округление миллисекунд.
 * Зачем нужно: секунды и минуты занимают меньше места в компактном заголовке, чем timestamp.
 */
export function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(1, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return minutes ? `${minutes}m ${seconds}s` : `${seconds}s`;
}
