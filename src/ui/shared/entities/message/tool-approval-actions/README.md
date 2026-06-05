# ToolApprovalActions

UI принятия решения по tool-call: комментарий + кнопки approve/deny-stop/deny-continue.

## Состав

- `ToolApprovalActions.tsx` — React-компонент.
- `ToolApprovalActions.module.scss` — локальные стили без Tailwind.
- `types.ts` — публичные props.
- `ToolApprovalActions.stories.tsx` — Storybook-сценарии.

## Важные ограничения

- Кнопки используют глобальные классы `primary-button`, `danger-button`, `secondary-button` — это shared UI contract проекта.
- Компактный режим (`compact=true`) добавляет отступ слева для выравнивания с содержимым карточки.
