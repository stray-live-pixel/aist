# 004 — Approval feedback as first-class signal

## Priority

P0 — высокий profit, средняя сложность.

## Цель

Сделать комментарии пользователя к tool approval явным сигналом для модели и UI.

## Scope

- Расширить модель approval result так, чтобы комментарий явно передавался как `userApprovalComment` в tool result.
- Для `deny-continue` возвращать структурированный отказ: decision, comment, continueAfterDeny.
- В tool-card UI сделать comment заметнее и отличить его от обычного result JSON.
- Добавить prompt rule: approval comments are high-priority instructions for current run.
- Сохранить текущую семантику stop/continue.
- Добавить tests на approve with comment, deny-continue with comment, deny-stop.

## Out of scope

- `rememberGlobal` / `rememberProject`.
- Post-run reflection.

## Acceptance criteria

- Модель получает комментарий пользователя в следующем model turn после tool result.
- UI показывает комментарий рядом с approval decision.
- Отказ с continue не теряется и влияет на дальнейший loop.
- Сборка релиза возможна после задачи.

## Suggested verification

- `npm run compile`
- unit tests для permission message mapping/tool runner
