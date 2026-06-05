import type { ReactNode, SelectHTMLAttributes } from 'react';

/** Что это: одна опция custom Select; зачем нужно: UI хранит label/value/disabled/category; проблема: списки моделей и настроек типизированы единообразно. */
export type SelectOption = { value: string; label: string; disabled?: boolean; category?: string };

/** Что это: категория опций Select; зачем нужно: длинные списки можно группировать и сворачивать; проблема: пользователь быстрее ищет модель/настройку. */
export type SelectCategory = { id: string; label: string; defaultCollapsed?: boolean };

/** Что это: поддерживаемые размеры Select; зачем нужно: sm для compact controls, md для форм; проблема: компонент сохраняет дизайн-системную плотность. */
export type SelectSize = 'sm' | 'md';

/** Что это: совместимое событие изменения значения Select; зачем нужно: callers могут использовать onChange как у input-like поля; проблема: migration с native select проще. */
export type SelectChangeEvent = { target: { value: string }; currentTarget: { value: string } };

/** Что это: позиция dropdown portal относительно trigger; зачем нужно: portal рендерится в body и требует fixed координат; проблема: dropdown не обрезается родительскими overflow. */
export type DropdownPlacement = 'top' | 'bottom';
export type DropdownPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  placement: DropdownPlacement;
};

/** Что это: публичные props custom Select; зачем нужно: компонент остаётся drop-in для форм и compact controls; проблема: единый select поддерживает search, categories и display labels. */
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

/** Что это: сгруппированные опции Select для dropdown/native optgroup; зачем нужно: renderer не должен знать алгоритм группировки; проблема: category ordering одинаковый в custom и hidden native select. */
export type OptionGroup = { key: string; category?: SelectCategory; options: SelectOption[] };
