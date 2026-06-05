import { Copy } from 'lucide-react';
import { type ReactNode } from 'react';

import { Button } from '../button';
import { classNames } from '../lib/classNames';
import styles from './LogBlock.module.scss';

export type LogBlockProps = {
  value: string;
  label?: ReactNode;
  emptyLabel?: string;
  copyLabel?: string;
  compact?: boolean;
  className?: string;
};

/**
 * Что это: plain-text log viewer с pre-wrap переносами.
 * Зачем нужно: логи должны оставаться логами, а не превращаться в псевдо-чат или custom event cards на каждой странице.
 * Пример: <LogBlock label="Daemon logs" value={logs.join('\n')} />.
 */
export function LogBlock({ value, label, emptyLabel = '', copyLabel, compact = false, className }: LogBlockProps) {
  const text = value || emptyLabel;

  return (
    <figure className={classNames(styles.figure, className)}>
      {label || copyLabel ? (
        <figcaption className={styles.caption}>
          {label ? <span>{label}</span> : <span />}
          {copyLabel ? (
            <Button
              size="sm"
              variant="ghost"
              leadingIcon={<Copy size={13} />}
              disabled={!value}
              onClick={() => void navigator.clipboard?.writeText(value)}
            >
              {copyLabel}
            </Button>
          ) : null}
        </figcaption>
      ) : null}
      <pre className={classNames(styles.pre, compact && styles.compact)}>{text}</pre>
    </figure>
  );
}
