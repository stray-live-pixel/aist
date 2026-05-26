import { memo } from 'react';

import { useI18n } from '../../../shared/i18n';
import type { AgentItemScope } from '../../../shared/types';
import styles from '../PermissionsPage.module.scss';

/**
 * Что это: сущности, для которых в настройках поведения показываются scope-вкладки.
 * Зачем нужно: подписи вкладок должны быть человекочитаемыми («Проектные роли»), а не техническими local/global.
 */
type BehaviorScopeSubject = 'skills' | 'roles' | 'instructions' | 'presets';

/**
 * Что это: значение вкладки в разделах поведения агента.
 * Зачем нужно: кроме областей хранения есть отдельная вкладка текущего эффективного состояния — она не должна притворяться global/local.
 */
export type BehaviorTab = AgentItemScope | 'active';

/**
 * Что это: переключатель активных, проектных и глобальных настроек поведения агента.
 * Зачем нужно: активные роли/пресеты/навыки вынесены в отдельную вкладку, а вкладки хранения остаются общими для всех разделов.
 */
export const BehaviorScopeTabs = memo(function BehaviorScopeTabs({
  activeTab,
  includeActive = false,
  subject,
  onChange
}: {
  activeTab: BehaviorTab;
  includeActive?: boolean;
  subject: BehaviorScopeSubject;
  onChange(tab: BehaviorTab): void;
}) {
  const { t } = useI18n();
  const tabs: Array<{ tab: BehaviorTab; label: string }> = [
    ...(includeActive
      ? [{ tab: 'active' as const, label: t(`settings.behaviorTabs.active.${subject}` as never) }]
      : []),
    { tab: 'local', label: t(`settings.behaviorTabs.local.${subject}` as never) },
    { tab: 'global', label: t(`settings.behaviorTabs.global.${subject}` as never) }
  ];

  return (
    <div className={styles.scopeTabs} role="tablist" aria-label={t('settings.behaviorTabs.ariaLabel')}>
      {tabs.map((tab) => (
        <button
          key={tab.tab}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.tab}
          className={`${styles.scopeTab} ${activeTab === tab.tab ? styles.scopeTabActive : ''}`}
          onClick={() => onChange(tab.tab)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
});
