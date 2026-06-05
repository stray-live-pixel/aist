import { Check, ChevronDown } from 'lucide-react';

import { classNames } from '../lib/classNames';
import styles from './Select.module.scss';
import type { OptionGroup, SelectOption } from './types';

/**
 * Что это: category group в custom Select dropdown.
 * Зачем нужно: group header и options живут вместе, а collapse state применяется только к своей категории.
 * Какую продуктовую проблему решает: длинные списки моделей остаются компактными и понятными.
 */
export function SelectOptionGroup({
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
