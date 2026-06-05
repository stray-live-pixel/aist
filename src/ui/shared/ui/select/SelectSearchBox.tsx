import { Search } from 'lucide-react';
import type { RefObject } from 'react';

import styles from './Select.module.scss';
import type { SelectOption } from './types';

/**
 * Что это: search box внутри custom Select dropdown.
 * Зачем нужно: длинные списки моделей и настроек фильтруются прямо в dropdown.
 * Какую продуктовую проблему решает: пользователь быстро находит нужную модель без отдельного экрана поиска.
 */
export function SelectSearchBox({
  filteredOptions,
  onQueryChange,
  onSelectValue,
  query,
  searchPlaceholder,
  searchRef
}: {
  filteredOptions: SelectOption[];
  onQueryChange(value: string): void;
  onSelectValue(value: string): void;
  query: string;
  searchPlaceholder: string;
  searchRef: RefObject<HTMLInputElement | null>;
}) {
  return (
    <span className={styles.searchBox}>
      <Search size={14} className={styles.searchIcon} />
      <input
        ref={searchRef}
        className={styles.searchInput}
        placeholder={searchPlaceholder}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            const firstEnabled = filteredOptions.find((option) => !option.disabled);
            if (firstEnabled) onSelectValue(firstEnabled.value);
          }
        }}
      />
    </span>
  );
}
