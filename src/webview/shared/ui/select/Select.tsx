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

function getEstimatedDropdownHeight(optionCount: number, searchable: boolean, size: SelectSize): number {
  const padding = 8;
  const searchHeight = searchable ? (size === 'sm' ? 32 : 34) : 0;
  const optionsGap = searchable ? 4 : 0;
  const optionHeight = 27;
  const emptyHeight = 32;
  return padding + searchHeight + optionsGap + Math.max(optionCount, 1) * (optionCount ? optionHeight : emptyHeight);
}

export type SelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'children' | 'size' | 'onChange' | 'value' | 'defaultValue'
> & {
  label?: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
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
    const currentValue = controlled ? value : internalValue;
    const selected = options.find((option) => option.value === currentValue);
    const selectFallback = t('summary.model');
    const displayLabel =
      (selected ? displayLabels?.[selected.value] || selected.label : undefined) || placeholder || selectFallback;
    const filteredOptions = useMemo(() => {
      const normalizedQuery = query.trim().toLowerCase();
      if (!normalizedQuery) {
        return options;
      }

      return options.filter((option) => `${option.label} ${option.value}`.toLowerCase().includes(normalizedQuery));
    }, [options, query]);

    useEffect(() => {
      if (disabled) {
        setOpen(false);
        setQuery('');
      }
    }, [disabled]);

    useLayoutEffect(() => {
      if (!open) {
        setDropdownPosition(undefined);
        return;
      }

      updateDropdownPosition();
    }, [open, size, filteredOptions.length, searchable, query]);

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
        getEstimatedDropdownHeight(filteredOptions.length, searchable, size)
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
                filteredOptions.map((option) => {
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
          {options.map((option) => (
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
