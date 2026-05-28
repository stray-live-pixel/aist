# 004 — File-backed config and global secret store

## Priority

P0 — high product importance, medium complexity.

## Goal

Ввести config/secret adapters для CLI/backend, где не-секретные настройки могут жить в workspace/global config, а секреты временно хранятся только в глобальном `~/.aist-agent`.

## Context

`OpenRouterClient` сейчас читает API key из VS Code settings/env, `CodexClient` хранит OAuth tokens в `context.secrets`. После выноса backend auth принадлежит CLI. Пользователь явно разрешил временный global `.aist-agent` storage, но не workspace, чтобы секреты случайно не попали в репозиторий.

## Scope

- Создать interfaces `ConfigStore` и `SecretStore` в core/node-safe слое.
- Реализовать file-backed config:
  - workspace `.aist-agent/settings.json` для project settings;
  - global `~/.aist-agent/settings.json` для user defaults.
- Реализовать global-only secret store:
  - хранение в `~/.aist-agent/secrets.json` или отдельном файле;
  - warning/JSDoc, что это временный fallback до OS keychain;
  - никогда не писать secrets в workspace root.
- Добавить adapter для VS Code, который может читать старые settings/secrets и отдавать их через interface, не меняя текущий UI.
- Добавить tests на precedence: env > explicit config/secret > defaults, где применимо.

## Out of scope

- Полная миграция Codex OAuth flow.
- Шифрование/OS keychain.
- CLI команды auth/config; они будут в отдельной issue.

## Implementation notes

- Не хранить OpenRouter API key в workspace `.aist-agent/settings.json`.
- File secret fallback должен быть легко заменяемым на keychain.
- При чтении config не падать на битом JSON: возвращать structured error или fallback, но логировать.
- Сохранить совместимость extension: текущие настройки VS Code ещё работают.

## Acceptance criteria

- Core/model clients могут принимать config/secret adapters вместо прямого VS Code доступа.
- Secrets path всегда находится под global `~/.aist-agent`.
- Tests покрывают запрет workspace secret writes.
- Extension продолжает использовать старый путь до следующих задач.

## Suggested verification

- `npm run typecheck`
- Focused unit tests для config/secret adapters
