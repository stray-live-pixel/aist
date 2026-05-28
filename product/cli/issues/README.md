# CLI extraction issues

Эти issues декомпозируют вынос backend/core AIST в самостоятельный TypeScript Node.js CLI. Порядок важен: каждая задача должна оставлять расширение компилируемым, тестируемым и пригодным для сборки VSIX, даже если CLI ещё не покрывает весь функционал.

## Product decisions

- CLI/backend становится будущим source of truth для runs, чатов, approvals, tools, model requests и auth.
- Код CLI пишется на TypeScript и собирается тем же npm-проектом без Python/shell runtime как обязательной зависимости.
- Auth и secrets принадлежат CLI/backend; временный допустимый storage — глобальный `~/.aist-agent`, а не workspace `.aist-agent`, чтобы секреты случайно не попали в репозиторий.
- Workspace state и проектные артефакты остаются в workspace `.aist-agent` и могут коммититься, если это не секреты.
- Миграция старых чатов из `vscode.Memento` не нужна; можно начать новое file-backed хранилище.
- Preview edits — обязательная фича: при переносе в CLI нужно сохранить adapter contract, чтобы VS Code продолжал показывать editable diff preview, а headless CLI имел diff-artifact approval fallback.
- Concurrent writers не поддерживаются: один активный run на chat/workspace, но несколько клиентов могут читать state/events.

## Recommended order

| #   | Issue                                                                                                   | Результат после задачи                                                       |
| --- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 001 | [Package boundaries and TypeScript build scaffold](001-package-boundaries-and-build-scaffold.md)        | Появляется безопасная структура `core`/`cli` без изменения runtime.          |
| 002 | [Shared runtime contracts without VS Code imports](002-shared-runtime-contracts.md)                     | Доменные типы готовы к использованию core и extension.                       |
| 003 | [Workspace/global path policy and atomic storage primitives](003-storage-path-policy-and-primitives.md) | Единые path/storage утилиты для workspace и global данных.                   |
| 004 | [File-backed config and global secret store](004-config-and-global-secret-store.md)                     | Настройки/секреты читаются через adapters, секреты не пишутся в репозиторий. |
| 005 | [Model transport adapters for OpenRouter and Codex](005-model-transport-adapters.md)                    | Модельные клиенты можно вызывать без `vscode.workspace`.                     |
| 006 | [File-backed chat and run repositories](006-file-backed-chat-and-run-repositories.md)                   | Новые чаты/runs можно хранить в `.aist-agent` без Memento.                   |
| 007 | [Move prompt, memory, telemetry, usage helpers to core](007-core-prompt-memory-telemetry.md)            | Чистые helper-модули становятся Node-safe.                                   |
| 008 | [Node filesystem tools core](008-node-filesystem-tools-core.md)                                         | CLI получает базовые workspace tools без VS Code API.                        |
| 009 | [Approval protocol and preview edit preservation](009-approval-protocol-and-preview-edits.md)           | Preview edits сохраняются через UI-assisted adapter contract.                |
| 010 | [Core tool registry and tool runner](010-core-tool-registry-and-runner.md)                              | Tool execution отделён от VS Code UI.                                        |
| 011 | [Core agent loop and run service event bus](011-core-agent-loop-and-run-service.md)                     | Agent loop работает через events и adapters.                                 |
| 012 | [CLI binary scaffold and command router](012-cli-binary-and-command-router.md)                          | Появляется `aist` CLI без запуска агента.                                    |
| 013 | [CLI config, auth and model commands](013-cli-config-auth-models.md)                                    | CLI управляет config/auth/models.                                            |
| 014 | [CLI chat storage commands](014-cli-chat-storage-commands.md)                                           | CLI умеет создавать/читать чаты.                                             |
| 015 | [Headless `aist chat ask --jsonl` MVP](015-headless-chat-ask-jsonl.md)                                  | Первый программный запуск агента из CLI.                                     |
| 016 | [VS Code extension storage/runtime adapter bridge](016-vscode-adapter-bridge.md)                        | Extension может использовать новый backend-код без смены UI.                 |
| 017 | [Daemon JSON-RPC MVP](017-daemon-json-rpc-mvp.md)                                                       | CLI запускается как долгоживущий backend.                                    |
| 018 | [VS Code thin-client daemon integration](018-vscode-thin-client-daemon-integration.md)                  | Extension начинает проксировать команды в daemon.                            |
| 019 | [Autonomous runner integration with CLI backend](019-autonomous-runner-cli-backend.md)                  | Autonomous сценарии используют общий backend/storage.                        |
| 020 | [Remove duplicated legacy extension runtime](020-remove-legacy-extension-runtime.md)                    | Старый extension runtime удалён после parity.                                |

## Release rule for every issue

Каждая issue должна завершаться состоянием, в котором:

- `npm run typecheck` проходит или в issue явно указана более узкая проверка для слоя, если общий typecheck уже был красным до начала.
- Unit tests для затронутого слоя добавлены или обновлены.
- Если менялись CLI команды/API/events, обновлены shared types и snapshots/fixtures.
- Если менялись webview IPC contracts, extension и webview стороны обновлены синхронно.
- VS Code extension можно собрать (`npm run build` или существующий focused build) без ожидания следующих issues.
- Новая архитектура не ломает текущий interactive agent, пока задача не переводит конкретный сценарий на CLI/backend.

## Autonomous-agent guidance

- Работать строго по одной issue за запуск.
- Не переименовывать issue в `DONE-` до review-фазы автономного workflow.
- Перед изменениями читать issue, этот README и затронутые файлы.
- Не делать миграцию старых Memento-чатов, если issue явно не изменила это решение.
- Не хранить secrets в workspace `.aist-agent`; для временного global fallback использовать `~/.aist-agent` и добавить/проверить gitignore safeguards только для workspace paths.
