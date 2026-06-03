import type { AgentAttachment, ModelTransportContentPart } from '../../shared/types/types';

/**
 * Что это: собирает content текущего user-сообщения с вложениями.
 * Зачем нужно: OpenRouter vision-модели ждут multipart content, а обычные файлы должны попасть в prompt как текстовый блок.
 * Какую продуктовую проблему решает: агент анализирует скриншоты и файлы без ручного копирования данных пользователем.
 */
export function buildUserContentWithAttachments({
  prompt,
  attachments
}: {
  prompt: string;
  attachments?: AgentAttachment[];
}): string | ModelTransportContentPart[] {
  const validAttachments =
    attachments?.filter((attachment) => attachment.kind === 'image' || attachment.text || attachment.name) || [];
  if (!validAttachments.length) {
    return prompt;
  }

  const parts: ModelTransportContentPart[] = [
    { type: 'text', text: buildTextIntro({ prompt, attachments: validAttachments }) }
  ];
  for (const attachment of validAttachments) {
    if (attachment.kind === 'image' && attachment.dataUrl) {
      parts.push({ type: 'image_url', image_url: { url: attachment.dataUrl } });
      continue;
    }

    parts.push({ type: 'text', text: buildFileTextBlock({ attachment }) });
  }

  return parts;
}

/** Формирует текстовый intro, чтобы модель понимала имена вложений и задачу пользователя. */
function buildTextIntro({ prompt, attachments }: { prompt: string; attachments: AgentAttachment[] }): string {
  const list = attachments
    .map((attachment, index) => `${index + 1}. ${attachment.name} (${attachment.mimeType})`)
    .join('\n');
  return `${prompt.trim()}\n\nAttached files for analysis:\n${list}`.trim();
}

/** Формирует текстовый fallback для обычных файлов и изображений без data URL. */
function buildFileTextBlock({ attachment }: { attachment: AgentAttachment }): string {
  const header = `Attachment: ${attachment.name}\nMIME: ${attachment.mimeType}\nSize: ${attachment.size} bytes`;
  if (attachment.text) {
    return `${header}\n\nContent:\n${attachment.text}`;
  }

  return `${header}\n\nContent is not available as text. Use the file metadata and ask the user for a smaller/text-readable file if needed.`;
}
