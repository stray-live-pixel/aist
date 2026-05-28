import { X } from 'lucide-react';
import { useEffect } from 'react';

import { useI18n } from '../../shared/i18n';
import { useAgentState } from '../../shared/lib/agentState';
import { ModalBackdrop, ModalHeader, ModalSurface } from '../../shared/ui';
import { IconButton } from '../../shared/ui/IconButton';
import { PermissionsPage } from '../permissions/PermissionsPage';
import type { SettingsPageId } from '../permissions/permissions-page/types';
import styles from './ChatPage.module.scss';
import { RequestSettingsPanel } from './RequestSettingsPanel';

type AgentSettingsModalProps = {
  onClose(): void;
  initialPage?: SettingsPageId;
};

/**
 * Что это: модалка полной настройки агента поверх чата.
 * Зачем нужно: быстрые настройки остаются в header, а глубокие разделы открываются embedded-версией PermissionsPage.
 */
export function AgentSettingsModal({ onClose, initialPage = 'overview' }: AgentSettingsModalProps) {
  const { t } = useI18n();
  const state = useAgentState();
  useEffect(() => {
    const closeByEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', closeByEscape);
    return () => document.removeEventListener('keydown', closeByEscape);
  }, [onClose]);

  return (
    <ModalBackdrop role="presentation" onMouseDown={onClose}>
      <ModalSurface size="settings" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <ModalHeader>
          <div>
            <h2>{t('settings.title')}</h2>
            <p>{t('settings.modalDescription')}</p>
          </div>
          <IconButton title={t('common.closeSettings')} onClick={onClose}>
            <X size={15} />
          </IconButton>
        </ModalHeader>
        <div className={styles.quickSettingsWrap}>
          <RequestSettingsPanel state={state} compact />
        </div>
        <PermissionsPage variant="embedded" initialPage={initialPage} />
      </ModalSurface>
    </ModalBackdrop>
  );
}
