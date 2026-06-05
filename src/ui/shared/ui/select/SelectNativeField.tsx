import type { Ref, SelectHTMLAttributes } from 'react';

import styles from './Select.module.scss';
import { buildOptionGroups } from './buildOptionGroups';
import type { SelectCategory, SelectOption } from './types';

/**
 * Что это: скрытый native select для формы и ref-совместимости.
 * Зачем нужно: custom Select сохраняет обычный form value, id и forwardRef contract.
 * Какую продуктовую проблему решает: миграция с native select не ломает формы и тестовые hooks.
 */
export function SelectNativeField({
  categories,
  currentValue,
  disabled,
  forwardedRef,
  placeholder,
  options,
  selectId,
  nativeProps
}: {
  categories?: SelectCategory[];
  currentValue?: string;
  disabled?: boolean;
  forwardedRef: Ref<HTMLSelectElement>;
  placeholder?: string;
  options: SelectOption[];
  selectId: string;
  nativeProps: Omit<
    SelectHTMLAttributes<HTMLSelectElement>,
    'children' | 'size' | 'onChange' | 'value' | 'defaultValue'
  >;
}) {
  return (
    <select
      ref={forwardedRef}
      id={selectId}
      className={styles.nativeSelect}
      tabIndex={-1}
      aria-hidden="true"
      value={currentValue || ''}
      disabled={disabled}
      onChange={() => undefined}
      {...nativeProps}
    >
      {placeholder ? <option value="">{placeholder}</option> : null}
      {renderNativeOptions({ options, categories })}
    </select>
  );
}

/**
 * Что это: рендерит option/optgroup для скрытого native select.
 * Зачем нужно: native fallback должен повторять category grouping custom-dropdown.
 * Какую продуктовую проблему решает: form/debug output не расходится с тем, что пользователь видит в dropdown.
 */
function renderNativeOptions({ options, categories }: { options: SelectOption[]; categories?: SelectCategory[] }) {
  if (!categories?.length) {
    return options.map((option) => renderOption({ option }));
  }

  return buildOptionGroups({ options, categories }).map((group) =>
    group.category ? (
      <optgroup key={group.key} label={group.category.label}>
        {group.options.map((option) => renderOption({ option }))}
      </optgroup>
    ) : (
      group.options.map((option) => renderOption({ option }))
    )
  );
}

/** Что это: один native option; зачем нужно: убрать дубли JSX; проблема: disabled/value/label не расходятся между ветками. */
function renderOption({ option }: { option: SelectOption }) {
  return (
    <option key={option.value} value={option.value} disabled={option.disabled}>
      {option.label}
    </option>
  );
}
