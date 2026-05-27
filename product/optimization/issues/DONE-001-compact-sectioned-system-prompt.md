# 001 — Compact sectioned system prompt

## Priority

P0 — максимальный profit, низкая сложность.

## Цель

Сократить и структурировать базовый system prompt, чтобы модель лучше соблюдала workflow и тратила меньше токенов на каждый запрос.

## Почему первой

Изменение локальное: в основном `src/extension/agent/config/prompts.ts`, частично default instructions/modes. Оно сразу влияет на все модели, все чаты и все tool calls.

## Scope

- Переписать `getSystemPrompt()` на секции: Identity, Workflow, Tool rules, Editing rules, Language, User instructions, Skills.
- Сохранить shell policy: shell разрешён для проектных команд, тестов, сборки и диагностики; для workspace mutations предпочитать previewable file-edit tools.
- Усилить требование конкретного `reason` для каждого tool call, чтобы модель четко, простым и понятным ПРОДУКТОВЫМ языком объясняла для чего она вызывает инструмент.
- Убрать дубли общих правил из default global instructions/modes или сделать их минимальными.
- Добавить unit/snapshot tests на EN/RU prompt и prompt со skills.

## Out of scope

- Memory, context governor, dynamic tools.
- Изменение UI настроек.

## Acceptance criteria

- Base prompt стал секционным и короче текущего по символам без потери ключевых правил.
- В prompt есть invariants: workspace-relative paths, concrete reason, shell policy, approval-aware edits, no fake results.
- Skills добавляются только при наличии skills.
- Сборка и тесты проходят.

## Suggested verification

- `npm run compile`
- unit/snapshot tests для prompt builder
