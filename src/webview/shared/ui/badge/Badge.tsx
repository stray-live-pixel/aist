import { type HTMLAttributes, type ReactNode } from 'react';

import { classNames } from '../lib/classNames';
import styles from './Badge.module.scss';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
  icon?: ReactNode;
};

/**
 * Что это: компактный badge для статусов и метаданных.
 * Зачем нужно: единый вид маленьких лейблов в карточках, настройках и списках.
 * Пример: <Badge tone="success">Done</Badge>.
 */
export function Badge({ tone = 'neutral', icon, className, children, ...props }: BadgeProps) {
  return (
    <span className={classNames(styles.badge, styles[tone], className)} {...props}>
      {icon ? <span className={styles.icon}>{icon}</span> : null}
      {children}
    </span>
  );
}
