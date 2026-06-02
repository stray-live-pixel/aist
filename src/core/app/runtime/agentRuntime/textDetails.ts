import type { OpenRouterMessage } from '../../../shared/types/types';
import type { AgentRuntimeText } from './types';

/**
 * Что это: строит короткий человекочитаемый detail по ответу модели.
 * Зачем нужно: пока модель думает, пользователь видит reasoning или черновик ответа в activity.
 * Какую продуктовую проблему решает: длинные streaming-тексты не ломают компактный статус запуска.
 */
export function getResponseDetail({
  message,
  text,
  fallback = text.finalAnswer()
}: {
  message: OpenRouterMessage;
  text: AgentRuntimeText;
  fallback?: string;
}): string {
  const reasoning = normalizeText({ value: message.reasoning });
  if (reasoning) {
    return text.reasoning(truncateDetail({ value: reasoning }));
  }

  const content = normalizeText({ value: message.content });
  if (content) {
    return text.answerDraft(truncateDetail({ value: content }));
  }

  return fallback;
}

/**
 * Что это: готовит короткий preview для live activity stream.
 * Зачем нужно: в status/detail показывается последняя содержательная часть длинного потока.
 * Какую продуктовую проблему решает: UI остаётся читаемым при длинном reasoning или ответе.
 */
export function normalizeActivityPreview({ value }: { value: string }): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= 260) {
    return normalized;
  }

  return normalized.slice(-260).trimStart();
}

function normalizeText({ value }: { value: unknown }): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function truncateDetail({ value }: { value: string }): string {
  return value.length > 220 ? `${value.slice(0, 217).trimEnd()}...` : value;
}
