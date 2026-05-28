# 013 — CLI config, auth and model commands

## Priority

P2 — required before practical headless model requests, high complexity.

## Goal

Добавить CLI команды для config/auth/models, использующие global secret store и model transport adapters.

## Context

Headless run невозможен без API key/Codex auth и выбора модели. Auth принадлежит CLI/backend; временный secret fallback — глобальный `~/.aist-agent`, не workspace.

## Scope

- Реализовать команды:
  - `aist config get [key] --workspace <path?>`;
  - `aist config set <key> <value> --scope global|workspace`;
  - `aist auth openrouter set-key` через stdin/env-safe prompt или `--from-env`;
  - `aist auth openrouter status`;
  - `aist auth codex status`;
  - `aist models list --provider openrouter|codex|all`;
  - `aist models refresh` если cache появится.
- Для Codex login можно оставить статус/placeholder, если полноценный OAuth CLI требует отдельной задачи; важно не ломать extension login.
- Скрывать secret values в output.
- Добавить JSON output option `--json` для scripts.
- Покрыть tests на config precedence и redaction.

## Out of scope

- Полный Codex browser OAuth CLI login, если он слишком большой; можно завести follow-up внутри issue notes.
- Agent run.
- Daemon API.

## Implementation notes

- OpenRouter key хранить в global secret store или принимать из env `OPENROUTER_API_KEY`.
- Workspace config не должен принимать secret keys; команда должна отказать с понятной ошибкой.
- Model list может использовать fallback options при отсутствии API key.
- Комментарии объясняют, почему secrets global-only.

## Acceptance criteria

- CLI может безопасно сохранить/прочитать OpenRouter auth status без печати key.
- Config get/set работают для не-секретных настроек.
- Models list использует adapters без VS Code.
- Extension auth path не сломан.

## Suggested verification

- `npm run typecheck`
- Focused CLI config/auth tests
- Manual `aist auth openrouter status --json`
