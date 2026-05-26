import { ArrowLeft } from 'lucide-react';
import { memo } from 'react';

import { useI18n } from '../../../shared/i18n';
import { IconButton } from '../../../shared/ui/IconButton';
import styles from '../PermissionsPage.module.scss';
import { NAV_GROUPS, NAV_ITEMS } from './navItems';
import type { SettingsPageId } from './types';

/**
 * Что это: левая навигация разделов settings.
 * Зачем нужно: memo защищает sidebar от лишних перерисовок при вводе в формах активного раздела.
 */
export const SettingsSidebar = memo(function SettingsSidebar({
  activePage,
  onChange
}: {
  activePage: SettingsPageId;
  onChange(page: SettingsPageId): void;
}) {
  const { t } = useI18n();
  return (
    <aside className={styles.sidebar}>
      {NAV_GROUPS.map((group) => (
        <section key={group.titleKey} className={styles.sidebarPanel}>
          <div className={styles.sidebarTitle}>{t(group.titleKey)}</div>
          <nav className={styles.nav}>
            {group.items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`${styles.navButton} ${activePage === item.id ? styles.navButtonActive : ''}`}
                title={t(item.descriptionKey)}
                onClick={() => onChange(item.id)}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span>{t(item.labelKey)}</span>
              </button>
            ))}
          </nav>
        </section>
      ))}
    </aside>
  );
});

/**
 * Что это: заголовок текущего раздела с опциональной кнопкой возврата.
 * Зачем нужно: в embedded-варианте заголовок компактный и без back-кнопки, но текст берётся из того же NAV_ITEMS.
 */
export const SettingsHeader = memo(function SettingsHeader({
  activePage,
  onBack,
  compact = false
}: {
  activePage: SettingsPageId;
  onBack?(): void;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const item = NAV_ITEMS.find((navItem) => navItem.id === activePage) || NAV_ITEMS[0];

  if (compact) {
    return <PageIntro activePage={activePage} />;
  }

  return (
    <div className={styles.headerRow}>
      {onBack ? (
        <IconButton title={t('common.backToChat')} onClick={onBack}>
          <ArrowLeft size={15} />
        </IconButton>
      ) : null}
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t(item.labelKey)}</h1>
        <p className={styles.pageDescription}>{t(item.descriptionKey)}</p>
      </header>
    </div>
  );
});

/**
 * Что это: текстовое описание активного раздела.
 * Зачем нужно: используется и в обычной странице, и в modal-embedded настройках без дублирования i18n lookup.
 */
function PageIntro({ activePage }: { activePage: SettingsPageId }) {
  const { t } = useI18n();
  const item = NAV_ITEMS.find((navItem) => navItem.id === activePage) || NAV_ITEMS[0];
  return (
    <header className={styles.pageHeader}>
      <h1 className={styles.pageTitle}>{t(item.labelKey)}</h1>
      <p className={styles.pageDescription}>{t(item.descriptionKey)}</p>
    </header>
  );
}
