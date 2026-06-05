import { Copy } from 'lucide-react';

import { useI18n } from '../../shared/i18n';
import { agentActions } from '../../shared/lib/agentActions';
import { IconButton } from '../../shared/ui/IconButton';
import styles from './CopyMessageButton.module.scss';
import type { CopyMessageButtonProps } from './types';

/**
 * Что это: кнопка копирования markdown-текста сообщения.
 * Зачем нужно: копирование выполняет extension через IPC, поэтому webview не зависит от Clipboard API и одинаково работает в VS Code webview.
 */
export function CopyMessageButton({ markdown }: CopyMessageButtonProps) {
  const { t } = useI18n();

  return (
    <span className={styles.root}>
      <IconButton
        title={t('message.copyMarkdown')}
        disabled={!markdown}
        onClick={() => agentActions.copyMessage(markdown)}
      >
        <Copy size={15} />
      </IconButton>
    </span>
  );
}
