import { History, SendHorizontal, Square } from 'lucide-react';
import type { ReactNode } from 'react';

import { useI18n } from '../../../shared/i18n';
import { Button, CompactNavigationButton, KeyboardShortcut } from '../../../shared/ui';
import styles from '../Composer.module.scss';
import { isMacLikePlatform } from '../utils';

/**
 * Что это: компактные кнопки header справа в Composer.
 * Зачем нужно: history action всегда стоит перед дополнительными действиями consumer-а.
 * Какую продуктовую проблему решает: пользователь стабильно находит историю prompt и кастомные настройки рядом.
 */
export function ComposerHeaderActions({
  headerActions,
  onOpenHistory
}: {
  headerActions?: ReactNode;
  onOpenHistory(): void;
}) {
  const { t } = useI18n();
  return (
    <>
      <CompactNavigationButton
        icon={<History size={12} />}
        title={t('composer.history.open')}
        onClick={onOpenHistory}
      />
      {headerActions}
    </>
  );
}

/**
 * Что это: footer actions Composer с shortcut и send/stop tactile button.
 * Зачем нужно: shared UI сохраняет focus states, aria-label и быстрый переход send/stop.
 * Какую продуктовую проблему решает: пользователь видит горячую клавишу и может остановить генерацию тем же местом.
 */
export function ComposerFooterActions({ busy, onSend, onStop }: { busy: boolean; onSend(): void; onStop(): void }) {
  const { t } = useI18n();
  return (
    <>
      <KeyboardShortcut label={t('composer.send')} keys={[isMacLikePlatform() ? '⌘' : 'Ctrl', '↵']} />
      <Button
        type="button"
        variant="tactile"
        size="sm"
        shape="round"
        iconOnly
        className={styles.sendButtonInstant}
        leadingIcon={busy ? <Square size={12} /> : <SendHorizontal size={15} />}
        title={busy ? t('composer.stop') : t('composer.send')}
        aria-label={busy ? t('composer.stopGeneration') : t('composer.sendMessage')}
        onClick={busy ? onStop : onSend}
      />
    </>
  );
}
