# PermissionPresetSelect

Select выбора preset прав доступа к инструментам.

## Состав

- `PermissionPresetSelect.tsx` — React-компонент и IPC отправка выбранного preset.
- `PermissionPresetSelect.module.scss` — локальные стили без Tailwind utility-классов.
- `types.ts` — публичные props компонента.
- `utils.ts` — вычисление описания выбранного значения для `title`.
- `PermissionPresetSelect.stories.tsx` — изолированные Storybook-сценарии.

## Инварианты

- `custom` — виртуальное состояние для несовпадения с preset, его нельзя отправлять как preset id.
- `className` используется только для внешнего layout, например ширины в шапке настроек.
