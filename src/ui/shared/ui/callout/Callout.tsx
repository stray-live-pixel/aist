import { type HTMLAttributes, type ReactNode } from 'react';

import { classNames } from '../lib/classNames';
import styles from './Callout.module.scss';

export type CalloutTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

export type CalloutProps = HTMLAttributes<HTMLDivElement> & {
  icon?: ReactNode;
  title?: ReactNode;
  tone?: CalloutTone;
  actions?: ReactNode;
  children: ReactNode;
};

/**
 * Что это: компактный информационный блок для подсказок, ошибок и важных inline-сообщений.
 * Зачем нужно: страницы не должны создавать свои warning/error/info surfaces поверх дизайн-системы.
 * Пример: <Callout tone="warning" title="Needs Docker">Install Docker before launch.</Callout>.
 */
export function Callout({ icon, title, tone = 'neutral', actions, className, children, ...props }: CalloutProps) {
  return (
    <div className={classNames(styles.root, styles[tone], className)} {...props}>
      {icon ? <span className={styles.icon}>{icon}</span> : null}
      <div className={styles.content}>
        {title ? <strong className={styles.title}>{title}</strong> : null}
        <div className={styles.body}>{children}</div>
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}
