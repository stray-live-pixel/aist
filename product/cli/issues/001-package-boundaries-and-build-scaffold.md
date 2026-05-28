# 001 — Package boundaries and TypeScript build scaffold

## Priority

P0 — foundational, low product risk.

## Goal

Подготовить структуру для постепенного выноса core и CLI так, чтобы текущий VS Code extension продолжал работать без изменения поведения.

## Context

Сейчас почти весь runtime живёт в `src/extension/**` и многие модули импортируют `vscode`. Перед переносом логики нужен безопасный каркас директорий, build targets и правила импортов. Эта задача не должна переносить agent loop или tools; она только создаёт место и компиляционный путь.

## Scope

- Создать директории `src/core/`, `src/cli/` и при необходимости `src/node/` или `src/adapters/` с минимальными index/types файлами.
- Добавить TypeScript build entry для CLI-кода без публикации полноценного бинаря.
- Обновить `tsconfig.json`/build scripts так, чтобы новые файлы компилировались вместе с проектом.
- Добавить ESLint/import-boundary правила или документированный lightweight guard: `src/core/**` не должен импортировать `vscode`.
- Добавить focused unit test или static test, который проверяет отсутствие `from 'vscode'` в `src/core/**`.
- Добавить краткий `src/core/README.md` с границами ответственности core vs CLI vs VS Code adapter.

## Out of scope

- Реальная CLI команда `aist`.
- Перенос существующего agent runtime.
- Изменение webview или поведения интерактивного агента.

## Implementation notes

- Делать изменения максимально механическими: пустые/минимальные exports, без переписывания доменной логики.
- Если текущий build использует esbuild entrypoints, добавить CLI entry позднее в отдельной issue; здесь достаточно, чтобы TypeScript видел новые файлы.
- Комментарии/JSDoc писать на русском и объяснять, почему core запрещает `vscode` imports.

## Acceptance criteria

- В репозитории есть явные директории для core и CLI.
- `src/core/**` компилируется и не импортирует `vscode`.
- Текущий VS Code extension запускается старым путём; runtime behavior не меняется.
- README/guard помогают следующему агенту понять границы.

## Suggested verification

- `npm run typecheck`
- `npm run test -- --run` или focused test для import guard
- `npm run build`
