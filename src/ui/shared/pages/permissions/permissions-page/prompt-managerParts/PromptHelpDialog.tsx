import { X } from 'lucide-react';

import { useI18n } from '../../../../i18n';
import { ModalBackdrop, ModalHeader, ModalSurface } from '../../../../ui';
import { IconButton } from '../../../../ui/IconButton';
import styles from '../../PermissionsPage.module.scss';

export function PromptHelpDialog({ onClose }: { onClose(): void }) {
  const { t } = useI18n();
  return (
    <ModalBackdrop role="presentation" onMouseDown={onClose}>
      <ModalSurface role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <ModalHeader>
          <div>
            <h2>{t('settings.promptManager.helpTitle')}</h2>
            <p>{t('settings.promptManager.helpDescription')}</p>
          </div>
          <IconButton title={t('common.close')} onClick={onClose}>
            <X size={15} />
          </IconButton>
        </ModalHeader>
        <div className={styles.dialogBody}>
          <p>
            <b className={styles.dialogStrong}>{t('common.instructions')}</b>{' '}
            {t('settings.promptManager.helpInstructions')}
          </p>
          <p>
            <b className={styles.dialogStrong}>{t('settings.nav.modes')}</b> {t('settings.promptManager.helpModes')}
          </p>
          <p>
            <b className={styles.dialogStrong}>{t('settings.promptManager.presetsTitle')}</b>{' '}
            {t('settings.promptManager.helpPresets')}
          </p>
          <p>{t('settings.promptManager.helpStorage')}</p>
        </div>
      </ModalSurface>
    </ModalBackdrop>
  );
}
