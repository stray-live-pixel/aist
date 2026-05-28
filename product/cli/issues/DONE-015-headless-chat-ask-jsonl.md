# 015 — Headless `aist chat ask --jsonl` MVP

## Priority

P2 — first end-to-end CLI value, very high complexity.

## Goal

Реализовать первый программный запуск агента из CLI: `aist chat ask <chatId> --prompt ... --jsonl`, который пишет events в stdout JSONL и сохраняет chat/run state в `.aist-agent`.

## Context

Это первая задача, где core runtime, model adapters, tools, storage и approval policy соединяются end-to-end. После неё агент можно запускать из скриптов без VS Code, но extension ещё может оставаться старым UI.

## Scope

- Добавить команду `aist chat ask <chatId> --prompt <text> --workspace <path> --jsonl`.
- Поддержать prompt из stdin: `--stdin`.
- Создавать run record и писать `events.jsonl`.
- Стримить backend events в stdout как JSONL:
  - run started/activity;
  - model request updates;
  - tool events;
  - message appended;
  - run finished/error.
- Поддержать non-interactive approval policies:
  - `--approval-mode ask` возвращает pending approval и ждёт future command или завершает с понятным кодом для MVP;
  - `auto-readonly` автоматически разрешает read/search tools;
  - `auto-all` разрешает всё кроме preview-required edit_file, если protocol запрещает;
  - `deny` отклоняет tools.
- Сохранять assistant answer в chat repository.
- Добавить integration tests с fake model client и fake tools.

## Out of scope

- Long-running daemon.
- Real interactive approval prompt в terminal, если это увеличивает scope.
- VS Code thin client.

## Implementation notes

- Тесты не должны ходить в реальные OpenRouter/Codex APIs.
- При отсутствии API key команда должна падать понятной ошибкой до создания частично running run или корректно закрывать run как error.
- Если chat busy/running, новый prompt запрещён.
- JSONL schema должна быть documented fixture: future clients будут зависеть от неё.

## Acceptance criteria

- Fake-model integration доказывает полный cycle user -> model -> final answer.
- Tool-call scenario с fake/read-only tool сохраняет history и events.
- CLI exit code отличает success/error/user approval required.
- Workspace storage после run можно прочитать через `aist chat get`.

## Suggested verification

- `npm run typecheck`
- Focused CLI e2e/integration tests with fake model
- Manual dry run/fake provider command if available
