import { FileText, Image, X } from 'lucide-react';

import { useI18n } from '../../../i18n';
import type { AgentAttachment } from '../../../types';
import styles from '../Composer.module.scss';
import { formatAttachmentSize } from '../formatAttachmentSize';

/**
 * Что это: компактный список выбранных вложений над textarea.
 * Зачем нужно: пользователь должен видеть, какие изображения и файлы уйдут модели, и уметь убрать лишнее.
 * Какую продуктовую проблему решает: отправка вложений становится предсказуемой и не превращается в скрытое действие.
 */
export function AttachmentTray({ attachments, attachmentError, readOnly, onRemoveAttachment }: AttachmentTrayProps) {
  const { t } = useI18n();
  if (!attachments?.length && !attachmentError) {
    return null;
  }

  return (
    <div className={styles.attachmentTray}>
      {attachments?.map((attachment) => (
        <span className={styles.attachmentChip} key={attachment.id} title={attachment.name}>
          {attachment.kind === 'image' ? <Image size={13} /> : <FileText size={13} />}
          <span className={styles.attachmentName}>{attachment.name}</span>
          <span className={styles.attachmentMeta}>{formatAttachmentSize({ bytes: attachment.size })}</span>
          {!readOnly ? (
            <button
              type="button"
              className={styles.attachmentRemove}
              aria-label={t('composer.attachmentRemove', { name: attachment.name })}
              onClick={() => onRemoveAttachment?.(attachment.id)}
            >
              <X size={12} />
            </button>
          ) : null}
        </span>
      ))}
      {attachmentError ? <span className={styles.attachmentError}>{attachmentError}</span> : null}
    </div>
  );
}

/**
 * Что это: props списка вложений Composer.
 * Зачем нужно: тип явно описывает очередь файлов, ошибку чтения и режим read-only для отправленного snapshot.
 * Какую продуктовую проблему решает: active и sent Composer показывают вложения одинаково, но старый snapshot не даёт удалять файлы.
 */
type AttachmentTrayProps = {
  attachments?: AgentAttachment[];
  attachmentError?: string;
  readOnly?: boolean;
  onRemoveAttachment?(attachmentId: string): void;
};
