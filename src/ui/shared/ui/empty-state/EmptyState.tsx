import { type ReactNode } from 'react';

import styles from './EmptyState.module.scss';

export type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
};

/**
 * Что это: единый пустой экран для списков и dashboard-секций.
 * Почему shared: autonomous dashboard, chat и настройки иначе начнут плодить
 * похожие карточки с разными отступами и контрастом.
 */
export function EmptyState({ icon, title, description, actions }: EmptyStateProps) {
  return (
    <div className={styles.emptyState}>
      {icon ? <div className={styles.icon}>{icon}</div> : null}
      <div className={styles.text}>
        <strong>{title}</strong>
        {description ? <span>{description}</span> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}
