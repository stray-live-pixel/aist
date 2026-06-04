import { ChevronRight } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';

import { classNames } from '../lib/classNames';
import styles from './CollapsibleSection.module.scss';

export type CollapsibleSectionTone = 'default' | 'subtle' | 'accent';

export type CollapsibleSectionProps = {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  collapsedPreview?: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  tone?: CollapsibleSectionTone;
  className?: string;
  onOpenChange?: (open: boolean) => void;
};

/**
 * Что это: shared cut с шевроном для деталей, длинных списков и логов.
 * Зачем нужно: страницы получают одинаковое раскрытие, focus-ring и collapsed preview без локальных ad-hoc блоков.
 * Пример: <CollapsibleSection title="Logs" collapsedPreview="12 events">...</CollapsibleSection>.
 */
export function CollapsibleSection({
  title,
  description,
  icon,
  meta,
  actions,
  children,
  collapsedPreview,
  defaultOpen = false,
  open,
  tone = 'default',
  className,
  onOpenChange
}: CollapsibleSectionProps) {
  const controlled = open !== undefined;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const expanded = controlled ? open : internalOpen;

  useEffect(() => {
    if (!controlled) {
      setInternalOpen(defaultOpen);
    }
  }, [controlled, defaultOpen]);

  function toggle() {
    const nextOpen = !expanded;
    if (!controlled) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  }

  return (
    <section className={classNames(styles.root, styles[tone], className)}>
      <div className={styles.header}>
        <button type="button" className={styles.toggle} aria-expanded={expanded} onClick={toggle}>
          <span className={styles.chevron} aria-hidden="true">
            <ChevronRight size={14} />
          </span>
          {icon ? <span className={styles.icon}>{icon}</span> : null}
          <span className={styles.heading}>
            <span className={styles.title}>{title}</span>
            {description ? <span className={styles.description}>{description}</span> : null}
          </span>
          {meta ? <span className={styles.meta}>{meta}</span> : null}
        </button>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
      {expanded ? <div className={styles.body}>{children}</div> : null}
      {!expanded && collapsedPreview ? <div className={styles.cut}>{collapsedPreview}</div> : null}
    </section>
  );
}
