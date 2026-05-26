# 005 — Engine abstraction: CLI и встроенные API-провайдеры

## Цель

Создать единый execution interface для autonomous stages, который поддерживает старые CLI engines и новые встроенные API engines.

## Target engines

MVP/target:

- `claude-cli` — Claude Code CLI;
- `codex-cli` — OpenAI Codex CLI;
- `openrouter-api` — текущий `OpenRouterClient`;
- `codex-api` — текущий `CodexClient`.

## Где реализовать

```text
src/extension/autonomous/engines/types.ts
src/extension/autonomous/engines/claudeCliEngine.ts
src/extension/autonomous/engines/codexCliEngine.ts
src/extension/autonomous/engines/openRouterEngine.ts
src/extension/autonomous/engines/codexApiEngine.ts
src/extension/autonomous/engines/registry.ts
```

## Interface

```ts
export type AutonomousEngineRunInput = {
  prompt: string;
  model?: string;
  workDir: string;
  resume?: AutonomousResumeRef;
  stageIndex?: number;
  abortSignal: AbortSignal;
};

export type AutonomousEngineRunResult = {
  ok: boolean;
  sessionRef?: AutonomousSessionRef;
  resultText: string;
  usage?: AutonomousUsage;
  rawLogArtifact?: string;
};

export type AutonomousEngineStream = {
  event(event: AutonomousEventInput): void;
  usage?(usage: AutonomousUsage): void;
};
```

## CLI engines

### Claude CLI

Повторить поведение `prompt/src/agents/claude_code/runtime.py`:

- `claude --permission-mode bypassPermissions`;
- `--allowedTools ...`;
- `--output-format stream-json`;
- parse stream JSON;
- capture session id;
- map tool events to autonomous events;
- support resume if sessionRef exists;
- support fork via copying Claude session jsonl как legacy-compatible implementation.

### Codex CLI

Повторить поведение `prompt/src/agents/codex/runtime.py`:

- `codex exec --json`;
- bypass approvals/sandbox;
- parse JSON events;
- capture thread/session id;
- support resume/fork if possible;
- stderr as artifact.

## API engines

### OpenRouter API

Использовать существующий `OpenRouterClient.chat`:

- model selection from flow stage `model`;
- no native resume/fork;
- contexts реализуются prompt-level summary/previous result injection;
- tool use policy для autonomous API engine нужно определить отдельно.

Варианты tools:

1. MVP API engine without tools: модель пишет только текст/план/summary.
2. Позже autonomous tool runtime без approvals, но с hard safety и session log.

### Codex API

Использовать существующий `CodexClient.chat`:

- model from `codex_model`;
- no Python;
- stream callbacks → autonomous events;
- auth через существующий Codex login.

## Resume/fork semantics

CLI engines имеют реальные session refs. API engines могут не иметь native resume. Поэтому orchestrator не должен предполагать, что `continue-from` всегда file-copy.

Engine capability:

```ts
supportsResume: boolean;
supportsFork: boolean;
supportsTools: boolean;
```

Если flow требует unsupported context mode:

- либо fallback к prompt summary mode;
- либо diagnostic/error до запуска.

Решение по MVP: для API engines `continue`/`continue-from` заменять на structured prompt context из предыдущих stage summaries/results, явно логируя `context.fallback`.

## Safety

- CLI bypass mode показывать warning в UI.
- API engines используют текущие credentials/settings.
- Autonomous API tools не включать в MVP без отдельного design issue.
- AbortController обязателен для всех engines.

## Тесты

- Registry выбирает engine.
- Model resolution для Claude/Codex/API.
- CLI command builder без shell string concat.
- Stream parser fixtures для Claude/Codex.
- API engine mock OpenRouter/Codex client.

## Критерии готовности

- Orchestrator запускает stage через abstract engine.
- CLI engines не требуют Python.
- API engines используют существующие clients.
- Unsupported capabilities диагностируются до запуска или fallback-ятся явно.
