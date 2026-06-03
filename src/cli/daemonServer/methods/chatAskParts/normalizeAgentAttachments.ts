import type { AgentAttachment } from '../../../../core/shared/types/types';

/**
 * Что это: нормализует вложения из daemon JSON-RPC команды chat.ask.
 * Зачем нужно: webview присылает JSON, а runtime должен получать только понятный безопасный контракт вложений.
 * Какую продуктовую проблему решает: пользовательские файлы доходят до модели, но повреждённый IPC payload не ломает запуск агента.
 */
export function normalizeAgentAttachments({ value }: { value: unknown }): AgentAttachment[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const attachments = value
    .map((item, index) => normalizeAgentAttachment({ value: item, index }))
    .filter((attachment): attachment is AgentAttachment => Boolean(attachment));
  return attachments.length > 0 ? attachments : undefined;
}

/** Нормализует одно вложение и отбрасывает некорректные записи без падения всего запроса. */
function normalizeAgentAttachment({ value, index }: { value: unknown; index: number }): AgentAttachment | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const name = toNonEmptyString(record.name) || `attachment-${index + 1}`;
  const mimeType = toNonEmptyString(record.mimeType) || 'application/octet-stream';
  const kind = record.kind === 'image' ? 'image' : 'file';
  const size = typeof record.size === 'number' && Number.isFinite(record.size) ? Math.max(0, record.size) : 0;
  const dataUrl = toNonEmptyString(record.dataUrl);
  const text = toNonEmptyString(record.text);

  return {
    id: toNonEmptyString(record.id) || `${index + 1}:${name}`,
    name,
    mimeType,
    size,
    kind,
    ...(dataUrl ? { dataUrl } : {}),
    ...(text ? { text } : {})
  };
}

/** Возвращает trimmed string или undefined, чтобы downstream не хранил пустые поля. */
function toNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}
