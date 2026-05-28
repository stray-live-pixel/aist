# 016 — Post-run reflection candidates

## Priority

P2/P3 — высокий strategic profit, высокая сложность.

## Цель

После завершения agent loop анализировать краткий trace работы и предлагать memory/definition candidates без автоматического применения.

## Scope

- Сформировать compact run trace: task, outcome, tools, reasons, errors, approval feedback, changed files, verification.
- Добавить reflection prompt с output schema для 0-3 candidates.
- Candidates: memory preference, project lesson, verification command, possible declarative definition.
- Показывать candidates в UI inbox, пользователь может save/reject.
- Не отправлять raw tool outputs и secrets в reflection.
- Добавить tests на trace builder и candidate validation.

## Out of scope

- Cloud sync.
- Автоматическое создание `.aist-agent/tools/**`.

## Acceptance criteria

- Reflection не запускается бесконечно и не блокирует завершение основного ответа.
- Пользователь видит предложения и может отклонить их.
- Сохранение candidate идёт через существующий memory store или обычный file edit approval.
- Сборка релиза возможна после задачи.

## Suggested verification

- `npm run compile`
- unit tests для trace/candidate validation
- ручной run с ошибкой tool и approval comment
