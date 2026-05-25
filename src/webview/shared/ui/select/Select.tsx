import { Check, ChevronDown, Search } from 'lucide-react';
import {
  type ReactNode,
  type SelectHTMLAttributes,
  forwardRef,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { createPortal } from 'react-dom';

import { useI18n } from '../../i18n';
import { classNames } from '../lib/classNames';
import styles from './Select.module.scss';

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
  category?: string;
};

export type SelectCategory = {
  id: string;
  label: string;
  defaultCollapsed?: boolean;
};

export type SelectSize = 'sm' | 'md';
export type SelectChangeEvent = {
  target: { value: string };
  currentTarget: { value: string };
};

type DropdownPlacement = 'top' | 'bottom';
type DropdownPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  placement: DropdownPlacement;
};

function getEstimatedDropdownHeight(
  optionCount: number,
  searchable: boolean,
  size: SelectSize,
  categoryCount = 0
): number {
  const padding = 8;
  const searchHeight = searchable ? (size === 'sm' ? 32 : 34) : 0;
  const optionsGap = searchable ? 4 : 0;
  const optionHeight = 27;
  const categoryHeight = 26;
  const emptyHeight = 32;
  return (
    padding +
    searchHeight +
    optionsGap +
    categoryCount * categoryHeight +
    Math.max(optionCount, 1) * (optionCount ? optionHeight : emptyHeight)
  );
}

export type SelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'children' | 'size' | 'onChange' | 'value' | 'defaultValue'
> & {
  label?: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
  categories?: SelectCategory[];
  placeholder?: string;
  size?: SelectSize;
  leadingIcon?: ReactNode;
  displayLabels?: Record<string, string>;
  value?: string;
  defaultValue?: string;
  searchable?: boolean;
  onChange?: (event: SelectChangeEvent) => void;
  onValueChange?: (value: string) => void;
};

type OptionGroup = {
  key: string;
  category?: SelectCategory;
  options: SelectOption[];
};

function buildOptionGroups(options: SelectOption[], categories: SelectCategory[] | undefined): OptionGroup[] {
  if (!categories?.length) {
    return [{ key: 'default', options }];
  }

  const groups = new Map<string, OptionGroup>();
  const uncategorized: SelectOption[] = [];

  for (const category of categories) {
    groups.set(category.id, { key: category.id, category, options: [] });
  }

  for (const option of options) {
    const group = option.category ? groups.get(option.category) : undefined;
    if (group) {
      group.options.push(option);
    } else {
      uncategorized.push(option);
    }
  }

  return [
    ...Array.from(groups.values()).filter((group) => group.options.length),
    ...(uncategorized.length ? [{ key: 'default', options: uncategorized }] : [])
  ];
}

/**
 * Что это: кастомный searchable select дизайн-системы.
 * Зачем нужно: единый macOS-like внешний вид без системного select, с поиском и нативной hidden-формой.
 * Пример: <Select label="Model" searchable options={models} />.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      hint,
      error,
      options,
      categories,
      placeholder,
      size = 'md',
      leadingIcon,
      displayLabels,
      className,
      id,
      value,
      defaultValue,
      disabled,
      searchable = true,
      onChange,
      onValueChange,
      ...props
    },
    ref
  ) => {
    const { t } = useI18n();
    const generatedId = useId();
    const selectId = id || generatedId;
    const rootRef = useRef<HTMLLabelElement>(null);
    const dropdownRef = useRef<HTMLSpanElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const controlled = value !== undefined;
    const [internalValue, setInternalValue] = useState(defaultValue || '');
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | undefined>();
    const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
      () => new Set((categories || []).filter((category) => category.defaultCollapsed).map((category) => category.id))
    );
    const currentValue = controlled ? value : internalValue;
    const selected = options.find((option) => option.value === currentValue);
    const selectFallback = t('summary.model');
    const displayLabel =
      (selected ? displayLabels?.[selected.value] || selected.label : undefined) || placeholder || selectFallback;
    const categoryById = useMemo(
      () => new Map((categories || []).map((category) => [category.id, category])),
      [categories]
    );
    const normalizedQuery = query.trim().toLowerCase();
    const filteredOptions = useMemo(() => {
      if (!normalizedQuery) {
        return options;
      }

      return options.filter((option) => {
        const categoryLabel = option.category ? categoryById.get(option.category)?.label || option.category : '';
        return `${option.label} ${option.value} ${categoryLabel}`.toLowerCase().includes(normalizedQuery);
      });
    }, [categoryById, normalizedQuery, options]);
    const optionGroups = useMemo(() => buildOptionGroups(filteredOptions, categories), [categories, filteredOptions]);
    const visibleOptionCount = useMemo(
      () =>
        optionGroups.reduce((count, group) => {
          const collapsed = group.category && !normalizedQuery && collapsedCategories.has(group.category.id);
          return count + (collapsed ? 0 : group.options.length);
        }, 0),
      [collapsedCategories, normalizedQuery, optionGroups]
    );

    useEffect(() => {
      if (disabled) {
        setOpen(false);
        setQuery('');
      }
    }, [disabled]);

    useEffect(() => {
      setCollapsedCategories((current) => {
        const categoryIds = new Set((categories || []).map((category) => category.id));
        const next = new Set<string>();

        for (const category of categories || []) {
          if (current.has(category.id) || category.defaultCollapsed) {
            next.add(category.id);
          }
        }

        for (const categoryId of current) {
          if (categoryIds.has(categoryId)) {
            next.add(categoryId);
          }
        }

        return next;
      });
    }, [categories]);

    useLayoutEffect(() => {
      if (!open) {
        setDropdownPosition(undefined);
        return;
      }

      updateDropdownPosition();
    }, [open, size, visibleOptionCount, optionGroups.length, searchable, query]);

    useEffect(() => {
      if (!open) {
        return;
      }

      searchRef.current?.focus();

      function handlePointerDown(event: PointerEvent) {
        const target = event.target as Node;
        if (!rootRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
          closeDropdown();
        }
      }

      function handleKeyDown(event: KeyboardEvent) {
        if (event.key === 'Escape') {
          closeDropdown();
        }
      }

      document.addEventListener('pointerdown', handlePointerDown);
      document.addEventListener('keydown', handleKeyDown);
      window.addEventListener('resize', updateDropdownPosition);
      window.addEventListener('scroll', updateDropdownPosition, true);

      return () => {
        document.removeEventListener('pointerdown', handlePointerDown);
        document.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('resize', updateDropdownPosition);
        window.removeEventListener('scroll', updateDropdownPosition, true);
      };
    }, [open]);

    function updateDropdownPosition() {
      const root = rootRef.current;
      if (!root) {
        return;
      }

      const rect = root.getBoundingClientRect();
      const gap = size === 'sm' ? 6 : 8;
      const viewportPadding = 12;
      const preferredHeight = Math.min(
        size === 'sm' ? 292 : 320,
        getEstimatedDropdownHeight(visibleOptionCount, searchable, size, optionGroups.length)
      );
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
      const spaceAbove = rect.top - viewportPadding;
      const placement: DropdownPlacement = spaceBelow >= Math.min(preferredHeight, spaceAbove) ? 'bottom' : 'top';
      const availableHeight = Math.max(96, placement === 'bottom' ? spaceBelow - gap : spaceAbove - gap);
      const maxHeight = Math.min(preferredHeight, availableHeight);
      const width = Math.max(rect.width, Math.min(size === 'sm' ? 280 : 320, window.innerWidth - viewportPadding * 2));
      const left = Math.min(Math.max(viewportPadding, rect.left), window.innerWidth - viewportPadding - width);
      const top = placement === 'bottom' ? rect.bottom + gap : rect.top - gap - maxHeight;

      setDropdownPosition({ top, left, width, maxHeight, placement });
    }

    function closeDropdown() {
      setOpen(false);
      setQuery('');
    }

    function toggleCategory(categoryId: string) {
      setCollapsedCategories((current) => {
        const next = new Set(current);
        if (next.has(categoryId)) {
          next.delete(categoryId);
        } else {
          next.add(categoryId);
        }
        return next;
      });
    }

    function selectValue(nextValue: string) {
      const nextOption = options.find((option) => option.value === nextValue);
      if (!nextOption || nextOption.disabled || disabled) {
        return;
      }

      if (!controlled) {
        setInternalValue(nextValue);
      }

      onValueChange?.(nextValue);
      onChange?.({ target: { value: nextValue }, currentTarget: { value: nextValue } });
      closeDropdown();
    }

    const dropdown = open
      ? createPortal(
          <span
            ref={dropdownRef}
            className={classNames(
              styles.dropdown,
              size === 'sm' && styles.dropdownSm,
              dropdownPosition?.placement === 'top' && styles.dropdownTop
            )}
            style={
              dropdownPosition
                ? {
                    top: dropdownPosition.top,
                    left: dropdownPosition.left,
                    width: dropdownPosition.width,
                    height: dropdownPosition.maxHeight,
                    maxHeight: dropdownPosition.maxHeight
                  }
                : undefined
            }
            role="presentation"
          >
            {searchable ? (
              <span className={styles.searchBox}>
                <Search size={14} className={styles.searchIcon} />
                <input
                  ref={searchRef}
                  className={styles.searchInput}
                  placeholder={t('select.search')}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      const firstEnabled = filteredOptions.find((option) => !option.disabled);
                      if (firstEnabled) {
                        selectValue(firstEnabled.value);
                      }
                    }
                  }}
                />
              </span>
            ) : null}
            <span className={styles.options} role="listbox" aria-label={label || placeholder || selectFallback}>
              {filteredOptions.length ? (
                optionGroups.map((group) => {
                  const collapsed = group.category && !normalizedQuery && collapsedCategories.has(group.category.id);

                  return (
                    <span key={group.key} className={styles.optionGroup}>
                      {group.category ? (
                        <button
                          type="button"
                          className={styles.categoryButton}
                          aria-expanded={!collapsed}
                          onClick={() => toggleCategory(group.category!.id)}
                        >
                          <ChevronDown className={styles.categoryChevron} size={12} />
                          <span className={styles.categoryLabel}>{group.category.label}</span>
                          <span className={styles.categoryCount}>{group.options.length}</span>
                        </button>
                      ) : null}
                      {!collapsed
                        ? group.options.map((option) => {
                            const active = option.value === currentValue;
                            return (
                              <button
                                key={option.value}
                                type="button"
                                className={classNames(styles.option, active && styles.optionActive)}
                                disabled={option.disabled}
                                role="option"
                                aria-selected={active}
                                onClick={() => selectValue(option.value)}
                              >
                                <Check size={14} className={classNames(styles.check, active && styles.checkVisible)} />
                                <span className={styles.optionLabel}>{option.label}</span>
                              </button>
                            );
                          })
                        : null}
                    </span>
                  );
                })
              ) : (
                <span className={styles.empty}>{t('select.noOptions')}</span>
              )}
            </span>
          </span>,
          document.body
        )
      : null;

    return (
      <label ref={rootRef} className={classNames(styles.field, styles[size], className)} htmlFor={selectId}>
        {label ? <span className={styles.label}>{label}</span> : null}
        <input type="hidden" name={props.name} value={currentValue || ''} />
        <select
          ref={ref}
          id={selectId}
          className={styles.nativeSelect}
          tabIndex={-1}
          aria-hidden="true"
          value={currentValue || ''}
          disabled={disabled}
          onChange={() => undefined}
          {...props}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {categories?.length
            ? buildOptionGroups(options, categories).map((group) =>
                group.category ? (
                  <optgroup key={group.key} label={group.category.label}>
                    {group.options.map((option) => (
                      <option key={option.value} value={option.value} disabled={option.disabled}>
                        {option.label}
                      </option>
                    ))}
                  </optgroup>
                ) : (
                  group.options.map((option) => (
                    <option key={option.value} value={option.value} disabled={option.disabled}>
                      {option.label}
                    </option>
                  ))
                )
              )
            : options.map((option) => (
                <option key={option.value} value={option.value} disabled={option.disabled}>
                  {option.label}
                </option>
              ))}
        </select>
        <span className={classNames(styles.control, error && styles.invalid, open && styles.open)}>
          <button
            type="button"
            className={classNames(styles.trigger, leadingIcon ? styles.withIcon : undefined)}
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-label={props['aria-label'] || label || placeholder || selectFallback}
            title={props.title || selected?.label || placeholder}
            onClick={() => setOpen((current) => !current)}
          >
            {leadingIcon ? <span className={styles.icon}>{leadingIcon}</span> : null}
            <span className={classNames(styles.value, !selected && styles.placeholder)}>{displayLabel}</span>
            <ChevronDown className={styles.chevron} size={size === 'sm' ? 14 : 16} />
          </button>
        </span>
        {dropdown}
        {error ? (
          <span className={styles.error}>{error}</span>
        ) : hint ? (
          <span className={styles.hint}>{hint}</span>
        ) : null}
      </label>
    );
  }
);

Select.displayName = 'Select';
