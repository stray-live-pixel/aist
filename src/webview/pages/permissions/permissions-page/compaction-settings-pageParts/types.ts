import type { useI18n } from '../../../../shared/i18n';

/**
 * Что это: option item для shared Select на странице compaction settings.
 * Зачем нужно: все секции используют единый формат value/label.
 * Какую продуктовую проблему решает: модельные и reasoning селекты не расходятся по структуре данных.
 */
export type SelectOptionItem = {
  value: string;
  label: string;
};

/**
 * Что это: тип функции перевода permissions page.
 * Зачем нужно: дочерние карточки получают t без повторного вызова i18n hook.
 * Какую продуктовую проблему решает: декомпозиция UI не меняет локализацию и тексты.
 */
export type TranslateFn = ReturnType<typeof useI18n>['t'];
