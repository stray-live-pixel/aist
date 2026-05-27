import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

import { useI18n } from '../../../shared/i18n';
import type { ChatPlan, ChatPlanItemStatus } from '../../../shared/types';
import styles from './ActivePlanWidget.module.scss';

export type ActivePlanWidgetProps = {
  plan: ChatPlan;
};

/**
 * Sticky-виджет активного плана вверху истории чата.
 * Свернутое состояние оставляет только заголовок и текущий шаг, чтобы план был
 * всегда виден при скролле, но не отнимал место у сообщений.
 */
export function ActivePlanWidget({ plan }: ActivePlanWidgetProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(true);
  const currentItem =
    plan.items.find((item) => item.status === 'in_progress') || plan.items.find((item) => item.status !== 'done');

  return (
    <section className={styles.root} aria-label={t('plan.title')}>
      <button className={styles.header} type="button" onClick={() => setExpanded((value) => !value)}>
        <span className={styles.chevron}>{expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
        <span className={styles.headerText}>
          <span className={styles.kicker}>{t('plan.title')}</span>
          <span className={styles.title}>{plan.title}</span>
          {!expanded && currentItem ? <span className={styles.current}>{currentItem.text}</span> : null}
        </span>
      </button>
      {expanded ? (
        <ol className={styles.list}>
          {plan.items.map((item, index) => (
            <li key={item.id || `${index}-${item.text}`} className={styles.item}>
              <span className={`${styles.status} ${styles[getStatusClass(item.status)]}`}>
                {getStatusLabel(item.status, t)}
              </span>
              <span className={styles.itemText}>{item.text}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

function getStatusClass(status: ChatPlanItemStatus): 'pending' | 'inProgress' | 'done' | 'blocked' {
  if (status === 'in_progress') {
    return 'inProgress';
  }
  return status;
}

function getStatusLabel(status: ChatPlanItemStatus, t: ReturnType<typeof useI18n>['t']): string {
  if (status === 'in_progress') {
    return t('plan.status.inProgress');
  }
  if (status === 'done') {
    return t('plan.status.done');
  }
  if (status === 'blocked') {
    return t('plan.status.blocked');
  }
  return t('plan.status.pending');
}
