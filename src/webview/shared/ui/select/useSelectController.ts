import { useEffect, useLayoutEffect, useMemo, useState } from 'react';

import { buildOptionGroups } from './buildOptionGroups';
import { calculateDropdownPosition } from './calculateDropdownPosition';
import type { SelectCategory, SelectOption, SelectProps, SelectSize } from './types';

/**
 * Что это: controller hook для custom Select.
 * Зачем нужно: фасад Select и dropdown renderer получают готовое состояние, callbacks и positioning.
 * Какую продуктовую проблему решает: controlled/uncontrolled value, search, categories и portal-position не смешиваются с JSX.
 */
export function useSelectController({
  options,
  categories,
  value,
  defaultValue,
  disabled,
  displayLabels,
  placeholder,
  searchable,
  size,
  selectFallback,
  rootRef,
  onChange,
  onValueChange
}: Pick<
  SelectProps,
  | 'options'
  | 'categories'
  | 'value'
  | 'defaultValue'
  | 'disabled'
  | 'displayLabels'
  | 'placeholder'
  | 'onChange'
  | 'onValueChange'
> & {
  searchable: boolean;
  size: SelectSize;
  selectFallback: string;
  rootRef: React.RefObject<HTMLElement | null>;
}) {
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState<ReturnType<typeof calculateDropdownPosition> | undefined>();
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(() =>
    getDefaultCollapsed({ categories })
  );
  const currentValue = controlled ? value : internalValue;
  const selected = options.find((option) => option.value === currentValue);
  const displayLabel =
    (selected ? displayLabels?.[selected.value] || selected.label : undefined) || placeholder || selectFallback;
  const categoryById = useMemo(
    () => new Map((categories || []).map((category) => [category.id, category])),
    [categories]
  );
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = useMemo(
    () => filterOptions({ options, normalizedQuery, categoryById }),
    [categoryById, normalizedQuery, options]
  );
  const optionGroups = useMemo(
    () => buildOptionGroups({ options: filteredOptions, categories }),
    [categories, filteredOptions]
  );
  const visibleOptionCount = useMemo(
    () => countVisibleOptions({ optionGroups, normalizedQuery, collapsedCategories }),
    [collapsedCategories, normalizedQuery, optionGroups]
  );

  useEffect(() => {
    if (disabled) closeDropdown();
  }, [disabled]);

  useEffect(() => {
    setCollapsedCategories((current) => mergeCollapsedCategories({ current, categories }));
  }, [categories]);

  useLayoutEffect(() => {
    if (!open) {
      setDropdownPosition(undefined);
      return;
    }
    updateDropdownPosition();
  }, [open, size, visibleOptionCount, optionGroups.length, searchable, query]);

  /** Закрывает dropdown и очищает search query. */
  function closeDropdown() {
    setOpen(false);
    setQuery('');
  }

  /** Пересчитывает portal-position относительно trigger label. */
  function updateDropdownPosition() {
    const root = rootRef.current;
    if (!root) return;
    setDropdownPosition(
      calculateDropdownPosition({
        rect: root.getBoundingClientRect(),
        size,
        visibleOptionCount,
        searchable,
        groupCount: optionGroups.length,
        viewport: { width: window.innerWidth, height: window.innerHeight }
      })
    );
  }

  /** Сворачивает или раскрывает category group. */
  function toggleCategory(categoryId: string) {
    setCollapsedCategories((current) => {
      const next = new Set(current);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }

  /** Выбирает value и отправляет onChange/onValueChange callbacks. */
  function selectValue(nextValue: string) {
    const nextOption = options.find((option) => option.value === nextValue);
    if (!nextOption || nextOption.disabled || disabled) return;
    if (!controlled) setInternalValue(nextValue);
    onValueChange?.(nextValue);
    onChange?.({ target: { value: nextValue }, currentTarget: { value: nextValue } });
    closeDropdown();
  }

  return {
    currentValue,
    selected,
    displayLabel,
    open,
    setOpen,
    query,
    setQuery,
    dropdownPosition,
    filteredOptions,
    optionGroups,
    normalizedQuery,
    collapsedCategories,
    closeDropdown,
    updateDropdownPosition,
    toggleCategory,
    selectValue
  };
}

/** Что это: initial collapsed set; зачем нужно: defaultCollapsed применяется при первом render; проблема: длинные списки можно открыть компактно. */
function getDefaultCollapsed({ categories }: { categories?: SelectCategory[] }): Set<string> {
  return new Set((categories || []).filter((category) => category.defaultCollapsed).map((category) => category.id));
}

/** Что это: фильтр опций Select; зачем нужно: search ищет по label/value/category; проблема: пользователь быстро находит модель в длинном списке. */
function filterOptions({
  options,
  normalizedQuery,
  categoryById
}: {
  options: SelectOption[];
  normalizedQuery: string;
  categoryById: Map<string, SelectCategory>;
}): SelectOption[] {
  if (!normalizedQuery) return options;
  return options.filter((option) => {
    const categoryLabel = option.category ? categoryById.get(option.category)?.label || option.category : '';
    return `${option.label} ${option.value} ${categoryLabel}`.toLowerCase().includes(normalizedQuery);
  });
}

/** Что это: сохраняет collapsed state при изменении categories; зачем нужно: category ids могут обновляться из props; проблема: пользовательский collapse не сбрасывается без причины. */
function mergeCollapsedCategories({
  current,
  categories
}: {
  current: Set<string>;
  categories?: SelectCategory[];
}): Set<string> {
  const categoryIds = new Set((categories || []).map((category) => category.id));
  const next = new Set<string>();
  for (const category of categories || [])
    if (current.has(category.id) || category.defaultCollapsed) next.add(category.id);
  for (const categoryId of current) if (categoryIds.has(categoryId)) next.add(categoryId);
  return next;
}

/** Что это: количество видимых option rows; зачем нужно: positioning учитывает collapsed groups; проблема: dropdown получает корректную высоту. */
function countVisibleOptions({
  optionGroups,
  normalizedQuery,
  collapsedCategories
}: {
  optionGroups: ReturnType<typeof buildOptionGroups>;
  normalizedQuery: string;
  collapsedCategories: Set<string>;
}): number {
  return optionGroups.reduce((count, group) => {
    const collapsed = group.category && !normalizedQuery && collapsedCategories.has(group.category.id);
    return count + (collapsed ? 0 : group.options.length);
  }, 0);
}
