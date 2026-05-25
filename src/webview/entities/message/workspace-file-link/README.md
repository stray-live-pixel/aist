# WorkspaceFileLink

Ссылка на файл workspace из результата tool-call. Клик открывает файл в VS Code.

## Состав

- `WorkspaceFileLink.tsx` — React-компонент.
- `WorkspaceFileLink.module.scss` — локальные стили без Tailwind.
- `types.ts` — публичные props.
- `WorkspaceFileLink.stories.tsx` — Storybook-сценарии.

## Инварианты

- Клик останавливает propagation, чтобы не раскрывать родительскую карточку.
- Использует `var(--tool-tone)` для наследования цвета от родительской tool-card.
