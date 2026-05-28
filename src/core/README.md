# Core boundary

`src/core/**` — слой для будущего agent runtime и доменной логики, общей для CLI и VS Code extension.

Core не импортирует `vscode`: этот пакет доступен только внутри extension host, а CLI должен компилироваться и запускаться без editor API. Всё, что требует VS Code API, остаётся в VS Code adapter слое.

Текущие границы:

- `src/core/**` хранит editor-agnostic типы и будущую переносимую runtime-логику.
- `src/core/types.ts` хранит Node-safe runtime contracts для chat history, model transport, runs, tools, approvals и client events.
- `src/cli/**` хранит будущий CLI entrypoint и может зависеть от `src/core/**`, но не публикует бинарь в рамках текущего scaffold.
- `src/extension/**` и `src/extension.ts` остаются текущим VS Code adapter/runtime путём и могут импортировать `vscode`.

Guard:

- `eslint.config.mjs` запрещает `vscode` imports в `src/core/**`.
- `src/core/importBoundaries.test.ts` статически проверяет TypeScript source-файлы core на `vscode` imports.
