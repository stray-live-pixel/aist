# AIST Autonomous Runner

Autonomous runner — нативная TypeScript/Node реализация бывшего `prompt/agent-auto` внутри VS Code extension. Shell/Python orchestration удалён из runtime: flow/run discovery, execution, monitoring и storage выполняются кодом `src/extension/autonomous`.

## Storage

Workspace source of truth:

```text
.aist-agent/
└── autonomous/
    ├── flows/<flowId>/.index.md
    ├── runs/<runId>/.index.md
    └── sessions/<sessionId>/
        ├── meta.json
        ├── command.json
        ├── events.jsonl
        ├── flow.json
        ├── batch.json
        ├── raw/
        └── artifacts/
```

`meta.json`, `command.json`, `flow.json`, `batch.json` пишутся atomic temp+rename. `events.jsonl` — append-only.

## Definitions

Flow `.index.md` поддерживает:

- `title`, `description`;
- `model`, `codex_model`;
- `default_summary_rules`;
- ordered `stages`.

Stage frontmatter поддерживает:

- `title`;
- `model`, `codex_model`;
- `summary_rules`;
- `contexts` с `continue`, `continue-from`, `summary-from`.

Run `.index.md` поддерживает:

- `dir`;
- `repeat`;
- `tasks` с `task`, `flow`, `repeat`.

## Engines

- `dry-run` — безопасная synthetic execution без внешних зависимостей.
- `claude-cli` — запускает `claude` напрямую через argv и `--output-format stream-json`.
- `codex-cli` — запускает `codex exec --json` напрямую через argv.
- `openrouter-api` — использует существующий `OpenRouterClient`.
- `codex-api` — использует существующий `CodexClient` и текущий login flow.

CLI engines могут запускать инструменты с bypass-флагами. Dashboard показывает это через engine capabilities; используйте dry-run для безопасной проверки definitions.

## UI

Команда `aist: Autonomous Runner` открывает React dashboard. UI построен на shared components из `src/webview/shared/ui` и не использует standalone HTML/CSS/JS старого monitor.

Dashboard умеет:

- показывать flows/runs;
- выбирать engine и dry-run;
- запускать flow/run;
- показывать sessions и event tail;
- stop running session;
- reveal session folder;
- export session as Markdown/JSON.

## Migration from prompt

Legacy runtime files (`agent-auto.sh`, Python scripts, standalone monitor) удалены. Definitions перенесены в `.aist-agent/autonomous/flows` и `.aist-agent/autonomous/runs`.

Если у пользователя есть внешний каталог старого формата, его можно импортировать через dashboard action `Import prompt` в workspace, где этот каталог ещё существует.

## Safety and limitations

- Chat agent и autonomous runner имеют разные controllers, stop commands и storage.
- Autonomous errors не append-ятся в chat history.
- API engines не поддерживают native resume/fork; context fallback строится на prompt-level previous result/summary.
- Full Claude/Codex session fork остаётся ограничением CLI adapters и не требуется для safe dry-run validation.
