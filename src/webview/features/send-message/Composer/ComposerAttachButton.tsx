import { Paperclip } from 'lucide-react';
import type { ChangeEvent } from 'react';

import { useI18n } from '../../../shared/i18n';
import styles from '../Composer.module.scss';

/**
 * Что это: нижняя кнопка Composer для выбора файлов через системный file picker.
 * Зачем нужно: скрепка живёт в начале нижней строки и не ломает ширину поля ввода.
 * Какую продуктовую проблему решает: пользователь быстро находит прикрепление файлов рядом с метаданными Composer.
 */
export function ComposerAttachButton({ onAttachmentInputChange }: ComposerAttachButtonProps) {
  const { t } = useI18n();

  return (
    <label className={styles.attachButton} title={t('composer.attach')}>
      <Paperclip size={14} />
      <input
        className={styles.fileInput}
        type="file"
        multiple
        aria-label={t('composer.attach')}
        onChange={onAttachmentInputChange}
      />
    </label>
  );
}

/**
 * Что это: props кнопки прикрепления файлов.
 * Зачем нужно: тип фиксирует единственную точку связи кнопки с controller-логикой Composer.
 * Какую продуктовую проблему решает: выбор файлов остаётся изолированным от разметки textarea и send controls.
 */
type ComposerAttachButtonProps = {
  onAttachmentInputChange?(event: ChangeEvent<HTMLInputElement>): void;
};
