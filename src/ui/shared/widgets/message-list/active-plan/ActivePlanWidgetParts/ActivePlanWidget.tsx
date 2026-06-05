import { CheckCircle2, ChevronDown, Circle, CircleDot, ListChecks, PauseCircle, X } from 'lucide-react';
import { type KeyboardEvent, useEffect, useMemo, useState } from 'react';

import { useI18n } from '../../../../i18n';
import { Badge, Button, Card, CompactControlGroup, CompactControlItem, Text } from '../../../../ui';
import styles from '../ActivePlanWidget.module.scss';
import { ActivePlanWidgetProps } from './ActivePlanWidgetProps';
import { getPlanSummary } from './getPlanSummary';
import { getStatusIcon } from './getStatusIcon';
import { getStatusLabel } from './getStatusLabel';
import { getStatusTone } from './getStatusTone';

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
