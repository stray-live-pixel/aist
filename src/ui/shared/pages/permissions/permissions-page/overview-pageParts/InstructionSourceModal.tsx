import { X } from 'lucide-react';

import { useI18n } from '../../../../i18n';
import { Badge, Button, ModalBackdrop, ModalCode, ModalHeader, ModalSurface } from '../../../../ui';
import styles from '../../PermissionsPage.module.scss';
import type { InstructionSourceViewModel } from './InstructionSourceViewModel';
import { stopPropagation } from './stopPropagation';

/**
 * Что это: модалка полного текста источника инструкций.
 * Зачем нужно: overview не заменяет редактор, но должен позволять проверить полный текст, который получит агент.
 * Какую продуктовую проблему решает: пользователь больше не видит обрезанный текст без способа понять, что скрыто.
 */
export function InstructionSourceModal({ source, onClose }: { source: InstructionSourceViewModel; onClose(): void }) {
  const { t } = useI18n();

  return (
    <ModalBackdrop role="presentation" onMouseDown={onClose}>
      <ModalSurface
        size="settings"
        role="dialog"
        aria-modal="true"
        aria-label={t('settings.overview.instructions.modalAria', { title: source.title })}
        onMouseDown={stopPropagation}
      >
        <ModalHeader>
          <div>
            <h2>{source.title}</h2>
            <p>{source.fullDescription}</p>
          </div>
          <div className={styles.overviewModalHeaderActions}>
            <Badge tone={source.badgeTone}>{source.typeLabel}</Badge>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              leadingIcon={<X size={14} />}
              title={t('common.close')}
              aria-label={t('common.close')}
              onClick={onClose}
            />
          </div>
        </ModalHeader>
        <div className={styles.overviewInstructionModalBody}>
          <ModalCode>{source.content}</ModalCode>
        </div>
      </ModalSurface>
    </ModalBackdrop>
  );
}
