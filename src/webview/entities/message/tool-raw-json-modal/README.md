# ToolRawJsonModal

Модалка с сырым JSON tool-call для диагностики.

## Состав

- `ToolRawJsonModal.tsx` — React-компонент.
- `ToolRawJsonModal.module.scss` — локальные стили без Tailwind.
- `types.ts` — публичные props.
- `ToolRawJsonModal.stories.tsx` — Storybook-сценарии.

## Инварианты

- Клик на backdrop закрывает модалку, клик на содержимое — нет (stopPropagation).
- JSON форматируется с отступом 2 пробела для читаемости.
