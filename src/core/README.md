# Core boundary

`src/core/**` — editor-agnostic слой agent runtime и доменной логики, общий для CLI daemon и thin clients.

Core не импортирует `vscode`: этот пакет доступен только внутри extension host, а CLI должен компилироваться и запускаться без editor API. Всё, что требует VS Code API, остаётся в adapter слое за пределами `src/core`.

## FSD layout

Core организован по Feature-Sliced Design. Новые инструменты живут в `src/core/tools/**`, а feature-слой использует их напрямую без скрытых bridge-реэкспортов.

- `src/core/app/**` — composition/runtime слой приложения: agent runtime service и config adapters.
- `src/core/processes/**` — долгие пользовательские процессы и orchestration flows, сейчас autonomous backend/flows/runs/engines.
- `src/core/entities/**` — доменные сущности и их persistence/transport: chats, runs, memory, model transports/auth/defaults, storage policy.
- `src/core/features/**` — пользовательские возможности агента: approvals, compaction, context governance, filesystem tools, planning, project tools, reflection, skills, system prompt, telemetry и tool execution.
- `src/core/shared/**` — shared contracts/utilities без бизнес-сценариев: JSON/runtime types, file repository helpers, frontmatter parser, repo map и structured tool errors.

## Current boundaries

- `src/core/shared/types/types.ts` хранит Node-safe runtime contracts для chat history, model transport, runs, tools, approvals и client events; `src/core/types.ts` — публичный фасад.
- `src/core/entities/storage/storage.ts` хранит Node-safe path policy и файловые primitives; `src/core/storage.ts` — публичный фасад.
- `src/core/app/config/config.ts` хранит Node-safe config/secret store contracts и file-backed adapters; `src/core/config.ts` — публичный фасад.
- `src/core/app/runtime/agentRuntime.ts` владеет in-process run lifecycle, retry/model request state, activity stream reduction and runtime event emission.
- `src/core/features/tool-execution/**` хранит registry/runner/compaction/tool-call helpers, а конкретные IO adapters инжектятся снаружи.
- `src/core/tools/fs/**` хранит Node-safe filesystem tools core: реальные операции идут через Node `fs`, workspace guard не даёт выйти за корень проекта, а tool runner находится рядом с fs-инструментами.
- `src/core/features/approval/approvalProtocol.ts` хранит backend approval protocol: JSONL-friendly approval requests, tool execution classes, VS Code editable diff preview handoff and headless diff artifact fallback.
- `src/core/processes/autonomous/**` хранит autonomous definitions discovery, orchestration, engines, backend и session storage без зависимости от чата.
- `src/cli/**` хранит CLI entrypoint и daemon backend, зависит от `src/core/**` и является source of truth для chats/runs/tools/model requests.
- `src/extension/**` и `src/extension.ts` остаются VS Code thin-client/adapters слоем и могут импортировать `vscode`; они не содержат отдельный agent backend.

## Storage policy

- Project-shareable artifacts live under `<workspace>/.aist-agent`: project memory, declarative tools and autonomous definitions.
- User-personal artifacts live under `~/.aist-agent/workspaces/<workspace-key>`: chats, runs, daemon logs, telemetry and autonomous session logs/results.
- User defaults and temporary secret fallback live under `~/.aist-agent`, not under the workspace.
- Secrets, chats, run logs and telemetry must not be written to workspace `.aist-agent`. Projects should keep gitignore safeguards for `.aist-agent/secrets*.json` and nested secret files while allowing non-secret project artifacts to be committed when desired.
- Workspace-relative paths must pass the core storage guard before joining with either the workspace root, workspace `.aist-agent` root, or the global workspace-scoped storage root.

## Guard

- `eslint.config.mjs` запрещает `vscode` imports в `src/core/**`.
- `src/core/shared/lib/importBoundaries.test.ts` статически проверяет TypeScript source-файлы core на `vscode` imports.
