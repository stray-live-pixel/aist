# MessageCard

Универсальная карточка сообщения для всех ролей (user, assistant, status, error, tool).

## Состав

- `MessageCard.tsx` — React-компонент с приватным MessageHeader.
- `MessageCard.module.scss` — локальные стили без Tailwind.
- `types.ts` — публичные props.
- `utils.ts` — определение варианта по роли, проверка collapsible.
- `MessageCard.stories.tsx` — Storybook-сценарии.

## Инварианты

- Tool-сообщения делегируются в `ToolMessageCard`.
- User и assistant сообщения сворачиваются до 150px с тенью-градиентом.
- `markdown-body` — глобальный класс для рендеринга Markdown (shared UI contract).
