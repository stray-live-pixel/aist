# 015 — Declarative project instructions loader

## Priority

P2 — высокий strategic profit, средняя/высокая сложность.

## Цель

Начать перенос agent definitions в декларативную `.aist-agent` модель через read-only loader project instructions.

## Scope

- Поддержать `.aist-agent/instructions/project.md` и `.aist-agent/policies/prompt-policy.md`.
- Добавить loader в system prompt pipeline с явным приоритетом после immutable kernel и memory.
- Не позволять этим файлам переопределять immutable safety/kernel rules.
- Добавить prompt snapshots для declarative instructions.
- Добавить UI/state отображение source в instruction sources.
- Обеспечить hot reload перед следующим model request через file digest или read-on-build.

## Out of scope

- Declarative tools.
- Агентское редактирование definitions inbox.

## Acceptance criteria

- Созданный `.aist-agent/instructions/project.md` попадает в следующий prompt.
- Удаление/изменение файла отражается без перезапуска extension.
- Immutable kernel остаётся в prompt.
- Сборка релиза возможна после задачи.

## Suggested verification

- `npm run compile`
- prompt snapshot tests
- ручная проверка изменения `.aist-agent/instructions/project.md`
