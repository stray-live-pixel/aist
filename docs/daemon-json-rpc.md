# AIST Daemon JSON-RPC MVP

`aist daemon --workspace <path>` starts one long-lived backend for a single workspace.

## Transport

The MVP transport is a local socket with newline-delimited JSON-RPC 2.0 messages. The default socket path is:

- Unix/macOS: `<os-tmp>/aist-daemon-<workspace-hash>.sock`
- Windows: `\\.\pipe\aist-daemon-<workspace-hash>`

Each request and response is one JSON object followed by `\n`. Runtime events are JSON-RPC notifications:

```json
{
  "jsonrpc": "2.0",
  "method": "event",
  "params": { "type": "state.changed", "workspaceRoot": "/repo", "activeRun": null, "at": 1 }
}
```

Clients opt in to broadcasts with `events.subscribe`; `events.unsubscribe` stops them. `state.get` is always read-only and can be used by reconnecting clients.

## Methods

MVP methods:

- `initialize`
- `state.get`
- `events.subscribe`
- `events.unsubscribe`
- `chat.create`
- `chat.list`
- `chat.get`
- `chat.ask`
- `chat.stop`
- `chat.setModel`
- `chat.compact`
- `approval.resolve`
- `config.get`
- `config.update`
- `models.list`
- `models.refresh`

Writer methods return an `operationId`. `chat.ask` returns `{ operationId, runId, chatId, accepted: true }` as soon as the run is accepted; progress and completion remain event-driven.

## Events

The daemon broadcasts `state.changed`, all `run.*` runtime events, all `tool.*` runtime events, and `message.appended`.

Only one writer run may be active per workspace. A second `chat.ask` while a run is active receives a predictable JSON-RPC error whose `error.data.code` is `run.busy`.

If a client disconnects, the active run continues. Stopping is explicit through `chat.stop`.

## Storage And Logs

The daemon uses the same file-backed chat/run/config stores as the CLI. Secrets remain global-only and are not written to workspace settings. Daemon diagnostics go to `<workspace>/.aist-agent/daemon.log`; request params are not logged, and secret-shaped fields are redacted.

Existing one-shot CLI commands (`chat ask --jsonl`, `chat get`, `config`, `models`, etc.) remain direct file/runtime commands in this MVP. Automatic daemon discovery or routing for those commands is left to the thin-client integration work.
