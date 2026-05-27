# 012 — Repo map cache and verification hints

## Priority

P2 — средний/high profit, высокая сложность.

## Цель

Снизить количество exploratory tool calls и ускорить выбор команд проверки без ограничения полноценного shell.

## Scope

- Добавить workspace-local repo map builder/cache.
- Извлекать package manager, scripts, основные config files, top-level dirs.
- Формировать verification hints для prompt/context note.
- Инвалидировать cache по package/config timestamps или digest.
- Показывать repo map excerpt только при необходимости, не в каждом prompt.
- Добавить tests на npm package scripts и отсутствие package.json.

## Out of scope

- Полный symbol index.
- Typed shell wrappers.

## Acceptance criteria

- Модель получает короткие verification hints там, где это полезно.
- Shell остаётся полноценным `run_bash_script`.
- Cache не ломает проекты без package.json.
- Сборка релиза возможна после задачи.

## Suggested verification

- `npm run compile`
- unit tests для repo map builder
