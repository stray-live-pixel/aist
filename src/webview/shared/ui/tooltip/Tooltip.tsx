import { type ReactNode } from 'react';

import { classNames } from '../lib/classNames';
import styles from './Tooltip.module.scss';

export type TooltipProps = {
  content: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * Что это: компактная CSS-подсказка для inline controls.
 * Зачем нужно: показывает подробности без JS-портала там, где достаточно hover/focus tooltip внутри панели.
 */
export function Tooltip({ content, children, className }: TooltipProps) {
  return (
    <span className={classNames(styles.root, className)}>
      {children}
      <span className={styles.content} role="tooltip">
        {content}
      </span>
    </span>
  );
}
