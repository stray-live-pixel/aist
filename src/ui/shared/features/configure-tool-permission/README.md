# ToolPermissionSelect

Строка настройки доступа к одному инструменту агента.

## Состав

- `ToolPermissionSelect.tsx` — React-компонент, отображение описания tool и IPC изменения permission.
- `ToolPermissionSelect.module.scss` — локальные стили карточки без Tailwind и без глобального `message-card`.
- `types.ts` — публичные props компонента.
- `utils.ts` — форматирование значения permission для текста о дефолте.
- `ToolPermissionSelect.stories.tsx` — изолированные Storybook-сценарии.

## Инварианты

- Компонент получает готовый `ToolPermissionItem` и не вычисляет список инструментов сам.
- Select отправляет только значения `ask` или `auto`.
