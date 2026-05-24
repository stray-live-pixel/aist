import { type HTMLAttributes, type ReactNode } from 'react';

import { classNames } from '../lib/classNames';
import styles from './KeyboardShortcut.module.scss';

export type KeycapProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
};

export type KeyboardShortcutProps = HTMLAttributes<HTMLSpanElement> & {
  keys: ReactNode[];
  separator?: ReactNode;
  label?: ReactNode;
};

/**
 * Что это: компактное отображение shortcut в виде отдельных клавиш.
 * Зачем нужно: единый стиль подсказок клавиатуры в composer и будущих controls.
 * Пример: <KeyboardShortcut keys={['⌘', '↵']} label="Send" />.
 */
export function KeyboardShortcut({ keys, separator = '+', label, className, ...props }: KeyboardShortcutProps) {
  return (
    <span className={classNames(styles.shortcut, className)} {...props}>
      {label ? <span className={styles.label}>{label}</span> : null}
      <span className={styles.keys} aria-hidden="true">
        {keys.map((key, index) => (
          <span key={index} className={styles.keyGroup}>
            {index > 0 ? <span className={styles.separator}>{separator}</span> : null}
            <Keycap>{key}</Keycap>
          </span>
        ))}
      </span>
    </span>
  );
}

export function Keycap({ className, children, ...props }: KeycapProps) {
  return (
    <kbd className={classNames(styles.keycap, className)} {...props}>
      {children}
    </kbd>
  );
}
