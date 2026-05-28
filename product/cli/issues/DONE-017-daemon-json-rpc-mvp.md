# 017 — Daemon JSON-RPC MVP

## Priority

P3 — unlocks thin clients, very high complexity.

## Goal

Реализовать `aist daemon --workspace <path>` как долгоживущий backend с JSON-RPC/stdio или local socket API и подпиской на events/state.

## Context

CLI `chat ask --jsonl` хорош для scripts, но VS Code/desktop/web clients требуют долгоживущий backend. MVP daemon должен обслуживать один workspace и запрещать concurrent writer runs, но разрешать нескольким клиентам читать state/events.

## Scope

- Выбрать MVP transport: stdio JSON-RPC для managed child process или local socket. Зафиксировать в docs.
- Реализовать daemon lifecycle:
  - initialize workspace;
  - state.get;
  - chat.create/list/get/ask/stop/setModel/compact минимально;
  - approval.resolve;
  - config.get/update;
  - models.refresh/list.
- Реализовать event subscription/broadcast:
  - state.changed;
  - run.\*;
  - tool.\*;
  - message.appended.
- Добавить one-active-run guard.
- Добавить client library для extension/CLI tests.
- Добавить integration tests с fake model.

## Out of scope

- Auth/session layer для remote web.
- Multi-workspace daemon.
- Automatic daemon discovery/launch in VS Code; это следующая issue.

## Implementation notes

- JSON-RPC commands должны возвращать operation/run ids, even если events остаются event-driven.
- Daemon не должен хранить secrets в workspace.
- Если client отключился, run продолжает или останавливается? Зафиксировать MVP decision; предпочтительно продолжает, stop отдельной командой.
- Logs писать в global/workspace диагностический файл без raw secrets.

## Acceptance criteria

- Daemon запускается, принимает state.get и chat.ask, стримит events клиенту.
- Второй chat.ask во время running получает predictable busy error.
- Tests покрывают reconnect/read-only state для второго клиента.
- CLI one-shot commands могут использовать daemon client optional или остаться direct; решение documented.

## Suggested verification

- `npm run typecheck`
- Daemon integration tests with fake model
- Manual daemon smoke in temp workspace
