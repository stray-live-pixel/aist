import { memo } from 'react';

import styles from '../../PermissionsPage.module.scss';
import { AgentProfileOverviewCard } from './AgentProfileOverviewCard';
import { InstructionSourcesOverviewCard } from './InstructionSourcesOverviewCard';
import type { OverviewPageProps } from './OverviewPageProps';
import { RequestSettingsOverviewCard } from './RequestSettingsOverviewCard';

/**
 * Что это: понятная summary-страница настроек агента.
 * Зачем нужно: обзор показывает, как агент будет вести себя в следующем запросе, без редактирования настроек.
 * Какую продуктовую проблему решает: пользователь быстро проверяет модель, доступы и активные инструкции перед работой.
 */
export const OverviewPage = memo(function OverviewPage(props: OverviewPageProps) {
  return (
    <div className={`${styles.sectionStack} ${styles.overviewRoot}`}>
      <AgentProfileOverviewCard {...props} />
      <RequestSettingsOverviewCard state={props.state} onNavigate={props.onNavigate} />
      <InstructionSourcesOverviewCard sources={props.instructionSources} onNavigate={props.onNavigate} />
    </div>
  );
});
