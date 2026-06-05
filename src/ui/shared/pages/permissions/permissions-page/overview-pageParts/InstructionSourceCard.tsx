import { ChevronRight, ExternalLink } from 'lucide-react';

import { useI18n } from '../../../../shared/i18n';
import { Badge, Button, Text } from '../../../../shared/ui';
import styles from '../../PermissionsPage.module.scss';
import type { SettingsPageId } from '../types';
import type { InstructionSourceViewModel } from './InstructionSourceViewModel';

/**
 * Что это: компактная карточка одного источника инструкций.
 * Зачем нужно: overview показывает суть источника и даёт явный путь к полному тексту или месту настройки.
 * Какую продуктовую проблему решает: пользователь понимает правило, его происхождение и следующий шаг без технических priority/id.
 */
export function InstructionSourceCard({
  source,
  onOpen,
  onNavigate
}: {
  source: InstructionSourceViewModel;
  onOpen(): void;
  onNavigate(page: SettingsPageId): void;
}) {
  const { t } = useI18n();

  return (
    <article className={styles.overviewInstructionCard}>
      <div className={styles.overviewInstructionCardMain}>
        <div className={styles.overviewInstructionCardHeader}>
          <Badge tone={source.badgeTone}>{source.typeLabel}</Badge>
          {source.isLong ? <Badge tone="neutral">{t('settings.overview.instructions.longText')}</Badge> : null}
        </div>
        <Text as="h3" variant="bodyStrong">
          {source.title}
        </Text>
        {source.preview ? <p className={styles.overviewInstructionPreview}>{source.preview}</p> : null}
        {source.originLabel ? <p className={styles.overviewInstructionOrigin}>{source.originLabel}</p> : null}
      </div>
      <div className={styles.overviewInstructionCardActions}>
        {source.canOpenFullText ? (
          <Button variant="secondary" size="sm" trailingIcon={<ChevronRight size={14} />} onClick={onOpen}>
            {t('settings.overview.action.readFull')}
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          trailingIcon={<ExternalLink size={13} />}
          onClick={() => onNavigate(source.settingsPage)}
        >
          {source.settingsActionLabel}
        </Button>
      </div>
    </article>
  );
}
