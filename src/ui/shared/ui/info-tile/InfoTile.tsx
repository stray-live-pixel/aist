import { type HTMLAttributes, type ReactNode } from 'react';

import { classNames } from '../lib/classNames';
import styles from './InfoTile.module.scss';

export type InfoTileTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

export type InfoTileProps = HTMLAttributes<HTMLDivElement> & {
  icon?: ReactNode;
  title: ReactNode;
  value: ReactNode;
  description?: ReactNode;
  tone?: InfoTileTone;
  actions?: ReactNode;
};

/**
 * Что это: компактная плитка с названием, главным значением и пояснением.
 * Зачем нужно: dashboard и overview-экраны показывают факты понятнее, чем набор одинаковых badge без контекста.
 * Какую продуктовую проблему решает: пользователь быстро понимает текущее состояние настройки и зачем она влияет на агента.
 */
export function InfoTile({
  icon,
  title,
  value,
  description,
  tone = 'neutral',
  actions,
  className,
  ...props
}: InfoTileProps) {
  return (
    <div className={classNames(styles.root, styles[tone], className)} {...props}>
      <div className={styles.header}>
        {icon ? <span className={styles.icon}>{icon}</span> : null}
        <span className={styles.title}>{title}</span>
      </div>
      <div className={styles.value}>{value}</div>
      {description ? <div className={styles.description}>{description}</div> : null}
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}
