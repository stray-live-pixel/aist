import { X } from 'lucide-react';

import { useI18n } from '../../../../i18n';
import { Button, ModalBackdrop, ModalHeader, ModalSurface, Text } from '../../../../ui';
import styles from '../../PermissionsPage.module.scss';
import { stopPropagation } from './stopPropagation';

/**
 * Что это: справочная модалка по блоку настроек следующего запроса.
 * Зачем нужно: основные карточки остаются чистыми, а подробные объяснения доступны по явному запросу пользователя.
 * Какую продуктовую проблему решает: UX не перегружен, но непонятные параметры можно быстро расшифровать.
 */
export function OverviewInfoModal({ onClose }: { onClose(): void }) {
  const { t } = useI18n();

  return (
    <ModalBackdrop role="presentation" onMouseDown={onClose}>
      <ModalSurface
        role="dialog"
        aria-modal="true"
        aria-label={t('settings.overview.help.aria')}
        onMouseDown={stopPropagation}
      >
        <ModalHeader>
          <div>
            <h2>{t('settings.overview.help.title')}</h2>
            <p>{t('settings.overview.help.description')}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            leadingIcon={<X size={14} />}
            title={t('common.close')}
            aria-label={t('common.close')}
            onClick={onClose}
          />
        </ModalHeader>
        <div className={styles.overviewModalBody}>
          <Text as="p" variant="body">
            {t('settings.overview.help.route')}
          </Text>
          <Text as="p" variant="body">
            {t('settings.overview.help.model')}
          </Text>
          <Text as="p" variant="body">
            {t('settings.overview.help.reasoning')}
          </Text>
          <Text as="p" variant="body">
            {t('settings.overview.help.editor')}
          </Text>
          <Text as="p" variant="body">
            {t('settings.overview.help.limit')}
          </Text>
        </div>
      </ModalSurface>
    </ModalBackdrop>
  );
}
