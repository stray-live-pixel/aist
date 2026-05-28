# Core boundary

`src/core/**` — слой для будущего agent runtime и доменной логики, общей для CLI и VS Code extension.

Core не импортирует `vscode`: этот пакет доступен только внутри extension host, а CLI должен компилироваться и запускаться без editor API. Всё, что требует VS Code API, остаётся в VS Code adapter слое.

Текущие границы:

- `src/core/**` хранит editor-agnostic типы и будущую переносимую runtime-логику.
- `src/core/types.ts` хранит Node-safe runtime contracts для chat history, model transport, runs, tools, approvals и client events.
- `src/core/storage.ts` хранит Node-safe path policy и файловые primitives для будущих CLI/backend stores.
- `src/cli/**` хранит будущий CLI entrypoint и может зависеть от `src/core/**`, но не публикует бинарь в рамках текущего scaffold.
- `src/extension/**` и `src/extension.ts` остаются текущим VS Code adapter/runtime путём и могут импортировать `vscode`.

Storage policy:

- Workspace artifacts live under `<workspace>/.aist-agent`: chats, runs, project memory, telemetry, declarative tools and autonomous sessions.
- User defaults and temporary secret fallback live under `~/.aist-agent`, not under the workspace.
- Secrets must not be written to workspace `.aist-agent`. Projects should keep gitignore safeguards for `.aist-agent/secrets*.json` and nested secret files while allowing non-secret project artifacts to be committed when desired.
- Workspace-relative paths must pass the core storage guard before joining with either the workspace root or workspace `.aist-agent` root.

Guard:

- `eslint.config.mjs` запрещает `vscode` imports в `src/core/**`.
- `src/core/importBoundaries.test.ts` статически проверяет TypeScript source-файлы core на `vscode` imports.
