/**
 * Что это: пустое состояние истории сообщений.
 * Зачем нужно: объясняет пользователю, что агент готов работать.
 * Пример использования: <EmptyState />.
 */
import { Sparkles } from 'lucide-react';

import { useI18n } from '../../../shared/i18n';
import { getWebviewAssetUri } from '../../../shared/lib/assets';
import { AistBrand } from '../../../shared/ui/AistLogo';
import { Text } from '../../../shared/ui/text';
import styles from './EmptyState.module.scss';
import type { EmptyStateProps } from './types';

export function EmptyState(_props: EmptyStateProps) {
  const { t } = useI18n();
  const hasLogo = Boolean(getWebviewAssetUri('logo'));

  return (
    <div className={styles.root}>
      {hasLogo ? <AistBrand /> : <Sparkles className={styles.sparkles} size={100} />}
      <div className={styles.text}>
        <h1 className={styles.title}>{t('empty.title')}</h1>
        <Text align="center" as="p" className={styles.description}>
          {t('empty.description')}
        </Text>
      </div>
    </div>
  );
}
