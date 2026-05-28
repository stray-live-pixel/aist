import { CheckCircle2, ChevronDown, Circle, CircleDot, ListChecks, PauseCircle, X } from 'lucide-react';
import { type KeyboardEvent, useEffect, useMemo, useState } from 'react';

import { useI18n } from '../../../shared/i18n';
import type { ChatPlan, ChatPlanItemStatus } from '../../../shared/types';
import { Badge, Button, Card, CompactControlGroup, CompactControlItem, Text } from '../../../shared/ui';
import styles from './ActivePlanWidget.module.scss';

export type ActivePlanWidgetProps = {
  plan: ChatPlan;
};

type PlanSummary = {
  total: number;
  done: number;
  blocked: number;
  inProgress: number;
  pending: number;
  completed: boolean;
};

/**
 * Sticky-виджет активного плана вверху истории чата.
 * Свернутое состояние оставляет summary и текущий шаг, чтобы план был виден при скролле,
 * но не отнимал место у сообщений. Завершенный план автоматически сворачивается и получает success-tone.
 */
export function ActivePlanWidget({ plan }: ActivePlanWidgetProps) {
  const { t } = useI18n();
  const summary = useMemo(() => getPlanSummary(plan), [plan]);
  const [expanded, setExpanded] = useState(() => !summary.completed);
  const [dismissedCompletedPlanKey, setDismissedCompletedPlanKey] = useState<string | null>(null);
  const planKey = `${plan.title}:${plan.items.map((item) => item.id).join('|')}`;
  const currentItem =
    plan.items.find((item) => item.status === 'in_progress') || plan.items.find((item) => item.status !== 'done');
  const previewItem = currentItem || plan.items.at(-1);
  const hasSummary = Boolean(summary.inProgress || summary.pending || summary.blocked);

  useEffect(() => {
    if (summary.completed) {
      setExpanded(false);
    } else {
      setDismissedCompletedPlanKey(null);
    }
  }, [summary.completed, planKey]);

  const toggleExpanded = () => setExpanded((value) => !value);
  const closeCompletedPlan = () => setDismissedCompletedPlanKey(planKey);
  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleExpanded();
    }
  };

  if (summary.completed && dismissedCompletedPlanKey === planKey) {
    return null;
  }

  return (
    <Card
      aria-expanded={expanded}
      aria-label={expanded ? 'Collapse plan' : 'Expand plan'}
      className={`${styles.root} ${summary.completed ? styles.completed : ''}`}
      role="button"
      tabIndex={0}
      tone={summary.completed ? 'accent' : 'elevated'}
      title={
        <span className={styles.titleRow}>
          <ChevronDown aria-hidden="true" className={expanded ? styles.chevronOpen : styles.chevron} size={14} />
          <span className={styles.titleText}>{plan.title}</span>
        </span>
      }
      description={summary.completed ? undefined : previewItem?.text || t('plan.title')}
      onClick={toggleExpanded}
      onKeyDown={handleCardKeyDown}
      actions={
        <div className={styles.actions}>
          <span className={styles.titleIcon} aria-hidden="true">
            {summary.completed ? <CheckCircle2 size={15} /> : <ListChecks size={15} />}
          </span>
          <Badge
            tone={summary.completed ? 'success' : 'accent'}
            icon={summary.completed ? <CheckCircle2 size={11} /> : null}
          >
            {summary.completed ? t('plan.status.done') : `${summary.done}/${summary.total || 0}`}
          </Badge>
          {summary.completed ? (
            <Button
              aria-label="Close completed plan"
              className={styles.closeButton}
              iconOnly
              shape="round"
              size="sm"
              title="Close completed plan"
              trailingIcon={<X aria-hidden="true" size={14} />}
              type="button"
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation();
                closeCompletedPlan();
              }}
              onKeyDown={(event) => event.stopPropagation()}
            />
          ) : (
            <Button
              aria-expanded={expanded}
              aria-label={expanded ? 'Collapse plan' : 'Expand plan'}
              className={styles.toggle}
              iconOnly
              shape="round"
              size="sm"
              title={expanded ? 'Collapse plan' : 'Expand plan'}
              trailingIcon={
                <ChevronDown aria-hidden="true" className={expanded ? styles.chevronOpen : styles.chevron} size={14} />
              }
              type="button"
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation();
                toggleExpanded();
              }}
              onKeyDown={(event) => event.stopPropagation()}
            />
          )}
        </div>
      }
    >
      {hasSummary || expanded ? (
        <>
          {hasSummary ? (
            <CompactControlGroup className={styles.summary} inline>
              {summary.inProgress ? (
                <CompactControlItem
                  icon={<CircleDot size={12} />}
                  text={`${summary.inProgress} ${t('plan.status.inProgress')}`}
                />
              ) : null}
              {summary.pending ? (
                <CompactControlItem
                  icon={<Circle size={12} />}
                  text={`${summary.pending} ${t('plan.status.pending')}`}
                />
              ) : null}
              {summary.blocked ? (
                <CompactControlItem
                  icon={<PauseCircle size={12} />}
                  text={`${summary.blocked} ${t('plan.status.blocked')}`}
                />
              ) : null}
            </CompactControlGroup>
          ) : null}

          {expanded ? (
            <ol className={styles.list}>
              {plan.items.map((item, index) => (
                <li key={item.id || `${index}-${item.text}`} className={styles.item}>
                  <Badge className={styles.status} tone={getStatusTone(item.status)} icon={getStatusIcon(item.status)}>
                    {getStatusLabel(item.status, t)}
                  </Badge>
                  <Text as="span" className={styles.itemText} variant={item.status === 'done' ? 'caption' : 'body'}>
                    {item.text}
                  </Text>
                </li>
              ))}
            </ol>
          ) : null}
        </>
      ) : null}
    </Card>
  );
}

function getPlanSummary(plan: ChatPlan): PlanSummary {
  const summary = plan.items.reduce(
    (acc, item) => {
      acc[item.status === 'in_progress' ? 'inProgress' : item.status] += 1;
      return acc;
    },
    { total: plan.items.length, done: 0, blocked: 0, inProgress: 0, pending: 0, completed: false } as PlanSummary
  );
  summary.completed = summary.total > 0 && summary.done === summary.total;
  return summary;
}

function getStatusTone(status: ChatPlanItemStatus): 'neutral' | 'accent' | 'success' | 'warning' | 'danger' {
  if (status === 'done') {
    return 'success';
  }
  if (status === 'in_progress') {
    return 'accent';
  }
  if (status === 'blocked') {
    return 'danger';
  }
  return 'neutral';
}

function getStatusIcon(status: ChatPlanItemStatus) {
  if (status === 'done') {
    return <CheckCircle2 size={11} />;
  }
  if (status === 'in_progress') {
    return <CircleDot size={11} />;
  }
  if (status === 'blocked') {
    return <PauseCircle size={11} />;
  }
  return <Circle size={11} />;
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
