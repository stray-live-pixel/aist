import { History, SendHorizontal, Square } from 'lucide-react';

import { useI18n } from '../../../shared/i18n';
import { Button, CompactNavigationButton, KeyboardShortcut } from '../../../shared/ui';
import styles from '../Composer.module.scss';
import { isMacLikePlatform } from '../utils';

/**
 * Что это: footer actions Composer с history, shortcut и send/stop tactile button.
 * Зачем нужно: shared UI сохраняет focus states, aria-label и быстрый переход send/stop.
 * Какую продуктовую проблему решает: пользователь находит историю prompt-ов рядом с главным действием отправки.
 */
export function ComposerFooterActions({
  busy,
  onOpenHistory,
  onSend,
  onStop
}: {
  busy: boolean;
  onOpenHistory(): void;
  onSend(): void;
  onStop(): void;
}) {
  const { t } = useI18n();
  return (
    <>
      <KeyboardShortcut label={t('composer.send')} keys={[isMacLikePlatform() ? '⌘' : 'Ctrl', '↵']} />
      <CompactNavigationButton
        icon={<History size={12} />}
        title={t('composer.history.open')}
        onClick={onOpenHistory}
      />
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
