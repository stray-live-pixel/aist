# ToolMessageCard

Компактная карточка tool-call с раскрытием деталей по клику.

## Состав

- `ToolMessageCard.tsx` — React-компонент с приватными субкомпонентами (ToolHeaderContent, ToolDetailsHeader, ToolTitle).
- `ToolMessageCard.module.scss` — локальные стили без Tailwind, включая tone-модификаторы.
- `types.ts` — публичные props.
- `utils.ts` — маппинг тонов на CSS-классы.
- `ToolMessageCard.stories.tsx` — Storybook-сценарии.

## Инварианты

- Карточка автоматически раскрывается при `approval === 'pending'`.
- `collapseToolId` позволяет ToolCallsCut свернуть карточку после обработки.
- CSS-переменные `--tool-tone` и `--tool-tone-strong` каскадируются в дочерние компоненты.
- `animate-pulse` на ToolIcon — единственный оставшийся Tailwind-класс (shared animation utility).
