import { BookOpenCheck, Brain, ShieldCheck, Wrench } from 'lucide-react';

import { useI18n } from '../../../../i18n';
import { Button, Card, InfoTile, Text } from '../../../../ui';
import styles from '../../PermissionsPage.module.scss';
import type { OverviewPageProps } from './OverviewPageProps';
import { getPermissionPresetDescription } from './getPermissionPresetDescription';
import { getPermissionPresetLabel } from './getPermissionPresetLabel';

/**
 * Что это: верхняя карточка с главным профилем агента.
 * Зачем нужно: пользователь сначала видит только самые важные факты — роль, доступы, правила и навыки.
 * Какую продуктовую проблему решает: обзор отвечает на вопрос «как сейчас будет вести себя агент» без перегруза панели.
 */
export function AgentProfileOverviewCard({
  state,
  activePermissionPresetId,
  activeMode,
  customSkills,
  instructionSources,
  onNavigate
}: OverviewPageProps) {
  const { t } = useI18n();
  const permissionLabel = getPermissionPresetLabel({
    presets: state.toolPermissionPresets,
    activeId: activePermissionPresetId,
    t
  });
  const permissionDescription = getPermissionPresetDescription({
    presets: state.toolPermissionPresets,
    activeId: activePermissionPresetId,
    t
  });
  const visibleInstructionCount = instructionSources.filter((source) => source.kind !== 'base').length;
  const roleLabel = activeMode?.label || t('settings.overview.defaultMode');

  return (
    <Card
      tone="elevated"
      className={styles.compactOverviewCard}
      title={t('settings.overview.profileTitle')}
      description={t('settings.overview.profileDescriptionCompact')}
      actions={
        <Button variant="ghost" size="sm" onClick={() => onNavigate('modes')}>
          {t('settings.overview.action.role')}
        </Button>
      }
    >
      <div className={styles.overviewHero}>
        <div className={styles.overviewHeroMain}>
          <Text as="h2" variant="title">
            {t('settings.overview.heroTitle', { role: roleLabel })}
          </Text>
          <Text as="p" variant="body">
            {t('settings.overview.heroDescriptionCompact')}
          </Text>
        </div>
      </div>

      <div className={styles.overviewPrimaryGrid}>
        <InfoTile
          icon={<Brain size={15} />}
          title={t('settings.overview.roleTitle')}
          value={roleLabel}
          description={t('settings.overview.roleDescription')}
          tone="accent"
        />
        <InfoTile
          icon={<ShieldCheck size={15} />}
          title={t('settings.overview.permissionsTitle')}
          value={permissionLabel}
          description={permissionDescription}
          tone={activePermissionPresetId === 'custom' ? 'warning' : 'success'}
          actions={
            <Button variant="ghost" size="sm" onClick={() => onNavigate('permissions')}>
              {t('settings.overview.action.permissions')}
            </Button>
          }
        />
      </div>

      <div className={styles.overviewTileGridCompact}>
        <InfoTile
          icon={<BookOpenCheck size={15} />}
          title={t('settings.overview.rulesTitle')}
          value={
            visibleInstructionCount
              ? t('settings.overview.rulesCount', { count: visibleInstructionCount })
              : t('settings.overview.rulesBaseOnly')
          }
          description={
            visibleInstructionCount
              ? t('settings.overview.rulesDescriptionActive')
              : t('settings.overview.rulesDescriptionBaseOnly')
          }
          tone={visibleInstructionCount ? 'accent' : 'neutral'}
        />
        <InfoTile
          icon={<Wrench size={15} />}
          title={t('settings.overview.skillsTitle')}
          value={
            customSkills.length
              ? t('settings.overview.skillsCount', { count: customSkills.length })
              : t('settings.overview.skillsEmpty')
          }
          description={
            customSkills.length
              ? t('settings.overview.skillsDescriptionActive')
              : t('settings.overview.skillsDescriptionEmpty')
          }
          tone={customSkills.length ? 'accent' : 'neutral'}
          actions={
            <Button variant="ghost" size="sm" onClick={() => onNavigate('skills')}>
              {t('settings.overview.action.skills')}
            </Button>
          }
        />
      </div>
    </Card>
  );
}
