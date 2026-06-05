import { FileText, HelpCircle, Settings2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useI18n } from '../../../../i18n';
import type { AgentInstructionSource } from '../../../../types';
import { Button, Card, EmptyState, Tooltip } from '../../../../ui';
import styles from '../../PermissionsPage.module.scss';
import type { SettingsPageId } from '../types';
import { InstructionSourceCard } from './InstructionSourceCard';
import { InstructionSourceModal } from './InstructionSourceModal';
import type { InstructionSourceViewModel } from './InstructionSourceViewModel';
import { getInstructionSourceViewModel } from './getInstructionSourceViewModel';

/**
 * Что это: обзор источников инструкций, которые реально попадут в prompt агента.
 * Зачем нужно: пользователь видит не технический порядок priority, а понятные правила и их происхождение.
 * Какую продуктовую проблему решает: активные инструкции становятся прозрачными без дублирования редакторов других вкладок.
 */
export function InstructionSourcesOverviewCard({
  sources,
  onNavigate
}: {
  sources: AgentInstructionSource[];
  onNavigate(page: SettingsPageId): void;
}) {
  const { t } = useI18n();
  const [selectedSource, setSelectedSource] = useState<InstructionSourceViewModel | null>(null);
  const viewModels = useMemo(() => sources.map((source) => getInstructionSourceViewModel({ source, t })), [sources, t]);
  const visibleSources = viewModels.filter(
    (source) => source.canOpenFullText || source.typeLabel !== t('settings.overview.instructions.type.base')
  );

  return (
    <Card
      className={styles.compactOverviewCard}
      title={t('settings.overview.instructions.title')}
      description={t('settings.overview.instructions.description')}
      actions={
        <div className={styles.overviewHeaderActions}>
          <Tooltip content={t('settings.overview.instructions.orderTooltip')}>
            <span className={styles.overviewCardHint}>
              <HelpCircle size={14} />
              <span>{t('settings.overview.instructions.orderHint')}</span>
            </span>
          </Tooltip>
          <Button
            variant="ghost"
            size="sm"
            leadingIcon={<Settings2 size={14} />}
            onClick={() => onNavigate('instructions')}
          >
            {t('settings.overview.action.instructions')}
          </Button>
        </div>
      }
    >
      {visibleSources.length ? (
        <div className={styles.overviewInstructionList}>
          {visibleSources.map((source) => (
            <InstructionSourceCard
              key={source.id}
              source={source}
              onOpen={() => setSelectedSource(source)}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<FileText size={18} />}
          title={t('settings.overview.instructions.emptyTitle')}
          description={t('settings.overview.instructions.emptyDescription')}
          actions={
            <Button variant="secondary" size="sm" onClick={() => onNavigate('instructions')}>
              {t('settings.overview.instructions.add')}
            </Button>
          }
        />
      )}
      {selectedSource ? (
        <InstructionSourceModal source={selectedSource} onClose={() => setSelectedSource(null)} />
      ) : null}
    </Card>
  );
}
