import { type SelectHTMLAttributes, forwardRef, useId, useRef } from 'react';

import { useI18n } from '../../i18n';
import { classNames } from '../lib/classNames';
import styles from './Select.module.scss';
import { SelectDropdown } from './SelectDropdown';
import { SelectFeedback } from './SelectFeedback';
import { SelectNativeField } from './SelectNativeField';
import { SelectTrigger } from './SelectTrigger';
import type { SelectCategory, SelectChangeEvent, SelectOption, SelectProps, SelectSize } from './types';
import { useSelectController } from './useSelectController';
import { useSelectDropdownLifecycle } from './useSelectDropdownLifecycle';

export type { SelectCategory, SelectChangeEvent, SelectOption, SelectProps, SelectSize };

/**
 * Что это: кастомный searchable select дизайн-системы.
 * Зачем нужно: единый macOS-like внешний вид без системного visible select, с поиском и native hidden fallback.
 * Какую продуктовую проблему решает: списки моделей и настроек остаются компактными, доступными и VS Code-native.
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
    const selectFallback = t('summary.model');
    const controller = useSelectController({
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
    });

    useSelectDropdownLifecycle({
      open: controller.open,
      rootRef,
      dropdownRef,
      searchRef,
      closeDropdown: controller.closeDropdown,
      updateDropdownPosition: controller.updateDropdownPosition
    });

    return (
      <label ref={rootRef} className={classNames(styles.field, styles[size], className)} htmlFor={selectId}>
        {label ? <span className={styles.label}>{label}</span> : null}
        <input type="hidden" name={props.name} value={controller.currentValue || ''} />
        <SelectNativeField
          categories={categories}
          currentValue={controller.currentValue}
          disabled={disabled}
          forwardedRef={ref}
          nativeProps={props as SelectNativeProps}
          options={options}
          placeholder={placeholder}
          selectId={selectId}
        />
        <span className={classNames(error && styles.invalid)}>
          <SelectTrigger
            ariaLabel={props['aria-label'] || label || placeholder || selectFallback}
            disabled={disabled}
            displayLabel={controller.displayLabel}
            leadingIcon={leadingIcon}
            open={controller.open}
            placeholder={placeholder}
            selectFallback={selectFallback}
            selected={controller.selected}
            size={size}
            title={props.title}
            onToggle={() => controller.setOpen((current) => !current)}
          />
        </span>
        {controller.open ? (
          <SelectDropdown
            collapsedCategories={controller.collapsedCategories}
            currentValue={controller.currentValue}
            dropdownPosition={controller.dropdownPosition}
            dropdownRef={dropdownRef}
            emptyLabel={t('select.noOptions')}
            filteredOptions={controller.filteredOptions}
            label={label}
            normalizedQuery={controller.normalizedQuery}
            optionGroups={controller.optionGroups}
            placeholder={placeholder}
            query={controller.query}
            searchable={searchable}
            searchPlaceholder={t('select.search')}
            searchRef={searchRef}
            selectFallback={selectFallback}
            size={size}
            onQueryChange={controller.setQuery}
            onSelectValue={controller.selectValue}
            onToggleCategory={controller.toggleCategory}
          />
        ) : null}
        <SelectFeedback error={error} hint={hint} />
      </label>
    );
  }
);

Select.displayName = 'Select';

type SelectNativeProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'children' | 'size' | 'onChange' | 'value' | 'defaultValue'
>;
