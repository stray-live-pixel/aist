import { type HTMLAttributes, type ReactNode } from 'react';

import { classNames } from '../lib/classNames';
import styles from './Card.module.scss';

export type CardTone = 'default' | 'elevated' | 'accent';

export type CardProps = HTMLAttributes<HTMLElement> & {
  tone?: CardTone;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
};

/**
 * Что это: универсальная поверхность-карточка.
 * Зачем нужно: быстро собирать панели, секции настроек и информационные блоки в одном стиле.
 * Пример: <Card title="Model" actions={<Button>Save</Button>}>...</Card>.
 */
export function Card({ tone = 'default', title, description, actions, className, children, ...props }: CardProps) {
  const hasDescription = Boolean(description);

  return (
    <section className={classNames(styles.card, styles[tone], className)} {...props}>
      {title || description || actions ? (
        <header className={classNames(styles.header, !hasDescription && styles.headerWithoutDescription)}>
          <div className={styles.heading}>
            {title ? <h3 className={styles.title}>{title}</h3> : null}
            {description ? <p className={styles.description}>{description}</p> : null}
          </div>
          {actions ? <div className={styles.actions}>{actions}</div> : null}
        </header>
      ) : null}
      {children ? <div className={styles.body}>{children}</div> : null}
    </section>
  );
}
