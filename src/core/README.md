# Core boundary

`src/core/**` — слой agent runtime и доменной логики, общей для CLI daemon и thin clients.

Core не импортирует `vscode`: этот пакет доступен только внутри extension host, а CLI должен компилироваться и запускаться без editor API. Всё, что требует VS Code API, остаётся в VS Code adapter слое.

Текущие границы:

- `src/core/**` хранит editor-agnostic типы и переносимую runtime-логику.
- `src/core/types.ts` хранит Node-safe runtime contracts для chat history, model transport, runs, tools, approvals и client events.
- `src/core/storage.ts` хранит Node-safe path policy и файловые primitives для будущих CLI/backend stores.
- `src/core/config.ts` хранит Node-safe config/secret store contracts и file-backed adapters.
- `src/core/prompts.ts`, `systemPrompt.ts`, `contextGovernor.ts`, `compaction.ts`, `reflection.ts`, `memory.ts`,
  `telemetry.ts` и `usage.ts` хранят reusable helper-логику agent runtime без VS Code API.
- `src/core/filesystemTools.ts`, `tools/applyPatch.ts`, `tools/semanticEdit.ts`, `repoMap.ts` и `toolErrors.ts`
  хранят Node-safe filesystem tools core: реальные операции идут через Node `fs`/`spawn`, workspace guard не даёт
  выйти за корень проекта, а VS Code preview/document-symbol capabilities остаются adapter-specific.
- `src/core/approvalProtocol.ts` хранит backend approval protocol: JSONL-friendly approval requests,
  tool execution classes, VS Code editable diff preview handoff and headless diff artifact fallback.
- `src/cli/**` хранит CLI entrypoint и daemon backend, зависит от `src/core/**` и является source of truth для chats/runs/tools/model requests.
- `src/extension/**` и `src/extension.ts` остаются VS Code thin-client/adapters слоем и могут импортировать `vscode`; они не содержат отдельный agent backend.

Storage policy:

- Workspace artifacts live under `<workspace>/.aist-agent`: chats, runs, project memory, telemetry, declarative tools and autonomous sessions.
- User defaults and temporary secret fallback live under `~/.aist-agent`, not under the workspace.
- Secrets must not be written to workspace `.aist-agent`. Projects should keep gitignore safeguards for `.aist-agent/secrets*.json` and nested secret files while allowing non-secret project artifacts to be committed when desired.
- Workspace-relative paths must pass the core storage guard before joining with either the workspace root or workspace `.aist-agent` root.

Guard:

- `eslint.config.mjs` запрещает `vscode` imports в `src/core/**`.
- `src/core/importBoundaries.test.ts` статически проверяет TypeScript source-файлы core на `vscode` imports.
