import type { OptionGroup, SelectCategory, SelectOption } from './types';

/**
 * Что это: группирует options по переданному списку categories.
 * Зачем нужно: custom dropdown и hidden native select должны показывать одинаковые группы.
 * Какую продуктовую проблему решает: модели/настройки не прыгают между открытым списком и формовым fallback.
 */
export function buildOptionGroups({
  options,
  categories
}: {
  options: SelectOption[];
  categories?: SelectCategory[];
}): OptionGroup[] {
  if (!categories?.length) return [{ key: 'default', options }];
  const groups = new Map<string, OptionGroup>();
  const uncategorized: SelectOption[] = [];
  for (const category of categories) groups.set(category.id, { key: category.id, category, options: [] });
  for (const option of options) {
    const group = option.category ? groups.get(option.category) : undefined;
    if (group) group.options.push(option);
    else uncategorized.push(option);
  }
  return [
    ...Array.from(groups.values()).filter((group) => group.options.length),
    ...(uncategorized.length ? [{ key: 'default', options: uncategorized }] : [])
  ];
}
