/**
 * Что это: широкая кнопка активных системных инструкций в начале чата.
 * Зачем нужно: пользователь видит примененные инструкции и может быстро поменять активный набор.
 * Пример использования: <SystemInstructionLabel mode={activeMode} sources={instructionSources} promptConfig={promptConfig} />.
 */
import { FileText, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { ModesSettingsPage } from '../../../pages/permissions/PermissionsPage';
import { useI18n } from '../../../shared/i18n';
import styles from './SystemInstructionLabel.module.scss';
import type { SystemInstructionDialogProps, SystemInstructionLabelProps } from './types';
import { getFallbackSources, getInstructionChips, truncateChip } from './utils';

export function SystemInstructionLabel({ mode, sources, promptConfig, busy: _busy }: SystemInstructionLabelProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const visibleSources = sources.length ? sources : getFallbackSources(mode, t);
  const title = t('systemInstructions.title', { count: visibleSources.length });
  const chips = getInstructionChips(promptConfig, visibleSources);

  useEffect(() => {
    if (!isOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isOpen]);

  return (
    <div className={styles.root}>
      <button
        type="button"
        className={styles.button}
        title={t('systemInstructions.show')}
        onClick={() => setIsOpen(true)}
      >
        <FileText size={13} className={styles.icon} />
        <span className={styles.title}>{t('systemInstructions.shortTitle')}</span>
        <span className={styles.chips}>
          {chips.length ? (
            chips.map((chip) => (
              <span key={chip.key} className={styles.chip} title={chip.label}>
                {truncateChip(chip.label)}
              </span>
            ))
          ) : (
            <span className={styles.fallbackTitle}>{title}</span>
          )}
        </span>
      </button>

      {isOpen
        ? createPortal(
            <SystemInstructionDialog title={title} promptConfig={promptConfig} onClose={() => setIsOpen(false)} />,
            document.body
          )
        : null}
    </div>
  );
}

function SystemInstructionDialog({ title, promptConfig, onClose }: SystemInstructionDialogProps) {
  const { t } = useI18n();

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="system-instruction-title"
      onClick={onClose}
    >
      <section className={styles.dialog} onClick={(event) => event.stopPropagation()}>
        <div className={styles.dialogHeader}>
          <div className={styles.dialogTitleWrap}>
            <h2 id="system-instruction-title" className={styles.dialogTitle}>
              {title}
            </h2>
            <p className={styles.dialogDescription}>{t('systemInstructions.manageDescription')}</p>
          </div>
          <button type="button" className={styles.closeButton} title={t('common.close')} onClick={onClose}>
            <X size={14} />
          </button>
        </div>
        <div className={styles.dialogBody}>
          <ModesSettingsPage promptConfig={promptConfig} />
        </div>
      </section>
    </div>
  );
}
