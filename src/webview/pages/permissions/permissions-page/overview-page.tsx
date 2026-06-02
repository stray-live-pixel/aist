import { memo } from 'react';

import { useI18n } from '../../../shared/i18n';
import type {
  AgentConfigScope,
  AgentInstructionSource,
  AgentMode,
  AgentSkill,
  AgentState,
  ToolPermissionPresetId
} from '../../../shared/types';
import { Badge, Card } from '../../../shared/ui';
import styles from '../PermissionsPage.module.scss';

/**
 * Что это: summary-панель настроек агента.
 * Зачем нужно: overview агрегирует ключевые факты, но не меняет состояние, поэтому memo уменьшает шум render при переключении дочерних форм.
 */
export const OverviewPage = memo(function OverviewPage({
  state: _state,
  agentConfigScope,
  activePermissionPresetId,
  activeMode,
  customSkills,
  instructionSources,
  codexAuthenticated
}: {
  state: AgentState;
  agentConfigScope: AgentConfigScope;
  activePermissionPresetId: ToolPermissionPresetId | 'custom';
  activeMode: AgentMode | undefined;
  customSkills: AgentSkill[];
  instructionSources: AgentInstructionSource[];
  codexAuthenticated: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className={styles.sectionStack}>
      <Card
        tone="elevated"
        title={t('settings.overview.profileTitle')}
        description={t('settings.overview.profileDescription')}
      >
        <div className={styles.twoColumns}>
          <Badge tone="accent">
            {t('settings.overview.storage', {
              value:
                agentConfigScope === 'workspace'
                  ? t('settings.overview.storageWorkspace')
                  : t('settings.overview.storageUser')
            })}
          </Badge>
          <Badge tone={activePermissionPresetId === 'custom' ? 'warning' : 'success'}>
            {t('settings.overview.permissions', { value: activePermissionPresetId })}
          </Badge>
          <Badge tone="neutral">
            {t('settings.overview.mode', { value: activeMode?.label || t('settings.overview.defaultMode') })}
          </Badge>
          <Badge tone={customSkills.length ? 'accent' : 'neutral'}>
            {t('settings.overview.skills', { count: customSkills.length })}
          </Badge>
          <Badge tone="neutral">
            {t('settings.overview.instructionSources', { count: instructionSources.length })}
          </Badge>
          <Badge tone={codexAuthenticated ? 'success' : 'warning'}>
            {t('settings.overview.codex', {
              value: codexAuthenticated
                ? t('settings.overview.codexAuthorized')
                : t('settings.overview.codexNotConnected')
            })}
          </Badge>
        </div>
      </Card>
      <Card title={t('settings.overview.orderTitle')} description={t('settings.overview.orderDescription')}>
        <InstructionSourceList sources={instructionSources} />
      </Card>
    </div>
  );
});

/**
 * Что это: список источников инструкций в порядке приоритета.
 * Зачем нужно: одинаково показывает реальные источники и пустое состояние без зависимости от всего overview.
 */
const InstructionSourceList = memo(function InstructionSourceList({ sources }: { sources: AgentInstructionSource[] }) {
  const { t } = useI18n();
  if (!sources.length) return <p className={styles.empty}>{t('settings.instructions.empty')}</p>;

  return (
    <div className={styles.list}>
      {sources.map((source) => (
        <Card
          key={source.id}
          title={source.title}
          description={[source.source, t('settings.instructions.priority', { priority: source.priority })]
            .filter(Boolean)
            .join(' · ')}
        >
          <p className={styles.clampedSourceText}>{source.content}</p>
        </Card>
      ))}
    </div>
  );
});
