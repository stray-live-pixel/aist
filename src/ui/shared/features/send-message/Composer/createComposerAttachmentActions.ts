import type { ChangeEvent } from 'react';

import type { AgentAttachment } from '../../../types';
import { prepareComposerAttachments } from '../prepareComposerAttachments';

/**
 * Что это: сценарии добавления и удаления файлов в Composer.
 * Зачем нужно: чтение файлов и обработка ошибок отделены от отправки prompt.
 * Какую продуктовую проблему решает: пользователь видит понятную ошибку вложений и может быстро убрать лишний файл перед отправкой.
 */
export function useComposerAttachmentActions({
  setAttachments,
  setAttachmentError
}: {
  setAttachments: React.Dispatch<React.SetStateAction<AgentAttachment[]>>;
  setAttachmentError: React.Dispatch<React.SetStateAction<string | undefined>>;
}) {
  /** Добавляет выбранные пользователем файлы в очередь вложений Composer. */
  async function addAttachmentsFromInput(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files || []);
    event.currentTarget.value = '';
    if (!files.length) return;

    try {
      const preparedAttachments = await prepareComposerAttachments({ files });
      setAttachments((current) => [...current, ...preparedAttachments]);
      setAttachmentError(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось прочитать выбранные файлы.';
      setAttachmentError(message);
    }
  }

  /** Удаляет вложение из очереди перед отправкой, если пользователь передумал. */
  function removeAttachment(attachmentId: string) {
    setAttachments((current) => current.filter((attachment) => attachment.id !== attachmentId));
  }

  return { addAttachmentsFromInput, removeAttachment };
}
