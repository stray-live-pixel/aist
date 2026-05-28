# 012 — CLI binary scaffold and command router

## Priority

P2 — visible CLI start, medium complexity.

## Goal

Добавить TypeScript CLI entrypoint и command router для бинаря `aist`, пока без запуска агента.

## Context

После появления core interfaces нужен пользовательский entrypoint. Эта задача должна быть безопасной: команды могут быть read-only/info, но packaging уже должен создавать JS entry для будущего bin.

## Scope

- Добавить `src/cli/main.ts` с shebang-compatible compiled output.
- Добавить `bin` в `package.json` или внутренний script `npm run aist -- ...` в зависимости от packaging strategy.
- Реализовать command parser без тяжёлой зависимости или с маленькой dependency, если она уже допустима.
- Команды MVP:
  - `aist --version`;
  - `aist --help`;
  - `aist doctor --workspace <path?>`;
  - `aist paths` для вывода workspace/global paths без secrets.
- Добавить tests/snapshots для help output и command parsing.
- Убедиться, что extension bundle не тащит CLI entry в webview.

## Out of scope

- `chat ask`.
- Daemon.
- Auth login.

## Implementation notes

- CLI должен быть TypeScript, Node.js runtime.
- Все ошибки печатать в stderr, machine-readable режим добавить позже.
- `doctor` должен проверять, что workspace root существует, `.aist-agent` доступен, global `~/.aist-agent` может быть создан.
- Не печатать secret values.

## Acceptance criteria

- `aist --help` и `aist doctor` работают из build output или npm script.
- Build/typecheck проходят.
- CLI entry не ломает VS Code extension packaging.

## Suggested verification

- `npm run typecheck`
- Focused CLI tests
- Manual `node <compiled-cli> --help` или npm script
