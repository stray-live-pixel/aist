import { Check, ChevronDown, Search } from 'lucide-react';
import type { RefObject } from 'react';
import { createPortal } from 'react-dom';

import { classNames } from '../lib/classNames';
import styles from './Select.module.scss';
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

/** Что это: search box dropdown; зачем нужно: длинные списки моделей фильтруются без отдельного UI; проблема: Enter выбирает первый enabled option. */
function SelectSearchBox({
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

/** Что это: category group в dropdown; зачем нужно: group header и options живут вместе; проблема: collapse state применяется только к своей категории. */
function SelectOptionGroup({
  collapsed,
  currentValue,
  group,
  onSelectValue,
  onToggleCategory
}: {
  collapsed: boolean;
  currentValue?: string;
  group: OptionGroup;
  onSelectValue(value: string): void;
  onToggleCategory(categoryId: string): void;
}) {
  return (
    <span className={styles.optionGroup}>
      {group.category ? (
        <SelectCategoryButton collapsed={collapsed} group={group} onToggleCategory={onToggleCategory} />
      ) : null}
      {!collapsed
        ? group.options.map((option) => (
            <SelectOptionButton
              key={option.value}
              active={option.value === currentValue}
              option={option}
              onSelectValue={onSelectValue}
            />
          ))
        : null}
    </span>
  );
}

/** Что это: кнопка категории dropdown; зачем нужно: пользователь сворачивает большие группы; проблема: длинные списки остаются компактными. */
function SelectCategoryButton({
  collapsed,
  group,
  onToggleCategory
}: {
  collapsed: boolean;
  group: OptionGroup;
  onToggleCategory(categoryId: string): void;
}) {
  return (
    <button
      type="button"
      className={styles.categoryButton}
      aria-expanded={!collapsed}
      onClick={() => onToggleCategory(group.category!.id)}
    >
      <ChevronDown className={styles.categoryChevron} size={12} />
      <span className={styles.categoryLabel}>{group.category!.label}</span>
      <span className={styles.categoryCount}>{group.options.length}</span>
    </button>
  );
}

/** Что это: одна option-кнопка dropdown; зачем нужно: active/disabled/focus states едины для всех списков; проблема: выбор модели не дублирует JSX. */
function SelectOptionButton({
  active,
  option,
  onSelectValue
}: {
  active: boolean;
  option: SelectOption;
  onSelectValue(value: string): void;
}) {
  return (
    <button
      type="button"
      className={classNames(styles.option, active && styles.optionActive)}
      disabled={option.disabled}
      role="option"
      aria-selected={active}
      onClick={() => onSelectValue(option.value)}
    >
      <Check size={14} className={classNames(styles.check, active && styles.checkVisible)} />
      <span className={styles.optionLabel}>{option.label}</span>
    </button>
  );
}

/** Что это: inline-style fixed dropdown; зачем нужно: React style не принимает undefined numeric layout как готовый object; проблема: portal появляется в правильной позиции. */
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
