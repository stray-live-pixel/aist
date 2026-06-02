import type { RefObject } from 'react';
import { createPortal } from 'react-dom';

import { classNames } from '../lib/classNames';
import styles from './Select.module.scss';
import { SelectOptionGroup } from './SelectOptionGroup';
import { SelectSearchBox } from './SelectSearchBox';
import type { DropdownPosition, OptionGroup, SelectOption, SelectSize } from './types';

/**
 * Что это: portal-dropdown custom Select с поиском, категориями и option list.
 * Зачем нужно: dropdown должен рендериться в body, чтобы не обрезаться overflow-контейнерами webview.
 * Какую продуктовую проблему решает: списки моделей/настроек удобно открываются в sidebar, modal и composer.
 */
export function SelectDropdown({
  collapsedCategories,
  currentValue,
  dropdownPosition,
  dropdownRef,
  filteredOptions,
  label,
  normalizedQuery,
  optionGroups,
  placeholder,
  query,
  searchable,
  searchPlaceholder,
  searchRef,
  selectFallback,
  size,
  emptyLabel,
  onQueryChange,
  onSelectValue,
  onToggleCategory
}: {
  collapsedCategories: Set<string>;
  currentValue?: string;
  dropdownPosition?: DropdownPosition;
  dropdownRef: RefObject<HTMLSpanElement | null>;
  filteredOptions: SelectOption[];
  label?: string;
  normalizedQuery: string;
  optionGroups: OptionGroup[];
  placeholder?: string;
  query: string;
  searchable: boolean;
  searchPlaceholder: string;
  searchRef: RefObject<HTMLInputElement | null>;
  selectFallback: string;
  size: SelectSize;
  emptyLabel: string;
  onQueryChange(value: string): void;
  onSelectValue(value: string): void;
  onToggleCategory(categoryId: string): void;
}) {
  return createPortal(
    <span
      ref={dropdownRef}
      className={classNames(
        styles.dropdown,
        size === 'sm' && styles.dropdownSm,
        dropdownPosition?.placement === 'top' && styles.dropdownTop
      )}
      style={toDropdownStyle({ dropdownPosition })}
      role="presentation"
    >
      {searchable ? (
        <SelectSearchBox
          query={query}
          searchPlaceholder={searchPlaceholder}
          searchRef={searchRef}
          filteredOptions={filteredOptions}
          onQueryChange={onQueryChange}
          onSelectValue={onSelectValue}
        />
      ) : null}
      <span className={styles.options} role="listbox" aria-label={label || placeholder || selectFallback}>
        {filteredOptions.length ? (
          optionGroups.map((group) => (
            <SelectOptionGroup
              key={group.key}
              collapsed={Boolean(group.category && !normalizedQuery && collapsedCategories.has(group.category.id))}
              currentValue={currentValue}
              group={group}
              onSelectValue={onSelectValue}
              onToggleCategory={onToggleCategory}
            />
          ))
        ) : (
          <span className={styles.empty}>{emptyLabel}</span>
        )}
      </span>
    </span>,
    document.body
  );
}

/**
 * Что это: inline-style fixed dropdown.
 * Зачем нужно: React style получает готовые координаты portal dropdown.
 * Какую продуктовую проблему решает: dropdown появляется в правильной позиции и не ломает layout webview.
 */
function toDropdownStyle({ dropdownPosition }: { dropdownPosition?: DropdownPosition }) {
  return dropdownPosition
    ? {
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        width: dropdownPosition.width,
        height: dropdownPosition.maxHeight,
        maxHeight: dropdownPosition.maxHeight
      }
    : undefined;
}
