# Configuration

[Русская документация](ru/configuration.md)

AIST settings use the `openrouterAgent.*` namespace.

## Main settings

```json
{
  "openrouterAgent.model": "openai/gpt-4o-mini",
  "openrouterAgent.language": "en"
}
```

| Setting                             | Default                | Description                                                                           |
| ----------------------------------- | ---------------------- | ------------------------------------------------------------------------------------- |
| `openrouterAgent.model`             | `"openai/gpt-4o-mini"` | Active model ID. OpenRouter IDs are used as-is; Codex IDs use the `codex:` prefix.    |
| `openrouterAgent.siteUrl`           | `""`                   | Optional site URL sent to OpenRouter rankings headers.                                |
| `openrouterAgent.siteName`          | `"aist"`               | Optional site name sent to OpenRouter rankings headers.                               |
| `openrouterAgent.maxContextChars`   | `12000`                | Maximum number of active-file characters attached as editor context.                  |
| `openrouterAgent.maxToolIterations` | `0`                    | Maximum model/tool-call turns per request. `0` means no configured limit.             |
| `openrouterAgent.reasoningEffort`   | `"auto"`               | OpenRouter reasoning effort: `auto`, `low`, `medium`, `high`.                         |
| `openrouterAgent.daemonBinaryPath`  | `""`                   | Optional path to the `aist` binary or bundled CLI JavaScript used for the daemon.     |
| `openrouterAgent.language`          | `"en"`                 | Agent response language and tool-call `reason` language: `en` or `ru`.                |
| `openrouterAgent.agentMode`         | `"default"`            | Active agent mode ID.                                                                 |
| `openrouterAgent.agentConfigScope`  | `"workspace"`          | Where project instructions, custom modes, skills, and compaction settings are stored. |

> Note: the source package may still contain older user settings. Set `openrouterAgent.language` to `en` explicitly if your workspace already has a different value.

## Backend

The VS Code extension is a thin client. Chat history, runs, approvals, tools, model requests, auth, memory, telemetry, compaction, and reflection are handled by `aist daemon --workspace <root>`.

Use `aist auth openrouter set-key` or `OPENROUTER_API_KEY` for OpenRouter auth. The removed legacy VS Code `openrouterAgent.apiKey` setting is read only as a compatibility import into the global daemon secret store.

## Agent config scope

`openrouterAgent.agentConfigScope` controls where AIST stores customization data:

- `workspace` — `.aist-agent/settings.json` inside the current workspace. This can be committed to the repository if desired.
- `user` — VS Code extension global storage, outside the repository.

Data stored through this mechanism includes:

- project instructions;
- custom agent modes;
- default-mode instruction overrides;
- custom skills;
- compaction settings.

## Tool permissions

`openrouterAgent.toolPermissions` stores per-tool approval mode:

```json
{
  "openrouterAgent.toolPermissions": {
    "get_workspace_info": "auto",
    "list_files": "auto",
    "read_file": "auto",
    "grep_search": "auto",
    "run_bash_script": "ask",
    "write_file": "ask",
    "replace_in_file": "ask",
    "create_directory": "ask",
    "delete_path": "ask"
  }
}
```

Allowed values:

- `auto` — run without manual confirmation;
- `ask` — show an approval card in chat before running.

The settings UI also provides presets:

| Preset       | Behavior                                                                       |
| ------------ | ------------------------------------------------------------------------------ |
| `balanced`   | Read/search automatically; ask before shell commands and file mutations.       |
| `fast-edit`  | Read/search/create/edit automatically; ask before shell commands and deletion. |
| `autonomous` | Run every available tool automatically.                                        |
| `custom`     | Shown when current permissions do not match a preset.                          |

## Agent language

The language setting affects:

- final assistant answers;
- every tool-call `reason` argument.

Supported values:

- `en` — English;
- `ru` — Russian.

The project default language is English.

## Compaction settings

Compaction is stored in the active agent config scope and defaults to:

```json
{
  "enabled": true,
  "thresholdPercent": 70,
  "keepLastMessages": 0
}
```

Limits enforced by the UI/runtime:

- `thresholdPercent`: `10` to `95`;
- `keepLastMessages`: `0` to `20`.

## Codex authorization

Codex authorization is managed by commands or the System settings page:

- `aist: Login ChatGPT Codex`;
- `aist: Logout ChatGPT Codex`.

Codex model IDs use the `codex:` prefix.
