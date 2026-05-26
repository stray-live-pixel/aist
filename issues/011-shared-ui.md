# 011 — Shared UI компоненты для autonomous dashboard

## Цель

Подготовить/доработать shared UI компоненты до реализации autonomous dashboard. Страница не должна содержать одноразовые кастомные controls, если их можно обобщить.

## Жёсткое правило

Если autonomous UI требует кастомный visual/control primitive, сначала:

1. проверить `src/webview/shared/ui`;
2. доработать существующий shared component; или
3. создать новый shared component со story;
4. только потом использовать на autonomous page.

## Вероятно нужные shared primitives

### EmptyState

Generic component вместо message-list-specific empty state.

Props:

- `icon?: ReactNode`;
- `title: string`;
- `description?: string`;
- `actions?: ReactNode`.

### StatusPill / Badge tones

Можно доработать `Badge`, если хватает API.

Statuses:

- running;
- done/success;
- warning;
- error;
- stopped;
- dry-run.

### KeyValueList

Для session metadata, engine capabilities, cwd, pid.

### PipelineSteps

Для flow stages без зависимости на autonomous types.

### CommandBlock / CodeBlock

Для команд, prompt preview, event details:

- copy action;
- monospace;
- max height;
- accessible label.

### EventLogList

Если log UI получается reusable:

- filters;
- search;
- compact/full view;
- copy event.

Можно начать page-local, но если логика повторяет standalone monitor concepts — лучше shared/widget.

## Styling rules

- SCSS modules.
- Цвета через существующие CSS variables/theme tokens.
- Не использовать inline styles.
- Не использовать emoji.
- Icons from `lucide-react`.
- JSDoc/комментарии на русском.

## Stories

Каждый новый/существенно доработанный component:

- default;
- long content;
- narrow layout;
- disabled/loading if applicable;
- action/copy if applicable.

## Критерии готовности

- Shared exports обновлены в `src/webview/shared/ui/index.ts`.
- Autonomous page может строиться из shared components.
- Stories добавлены.
- `npm run typecheck` проходит.
