---
title: Settings
description: Main AIST settings.
---

AIST settings use the `openrouterAgent.*` namespace.

Common settings:

| Setting                             | Default              | Description                                            |
| ----------------------------------- | -------------------- | ------------------------------------------------------ |
| `openrouterAgent.model`             | `openai/gpt-4o-mini` | Active model ID.                                       |
| `openrouterAgent.language`          | `en`                 | Agent response language and tool-call reason language. |
| `openrouterAgent.editorContextMode` | `auto`               | Controls automatic editor context.                     |
| `openrouterAgent.maxContextChars`   | `12000`              | Maximum active-file characters attached as context.    |
| `openrouterAgent.reasoningEffort`   | `auto`               | Reasoning effort sent to OpenRouter when supported.    |
| `openrouterAgent.agentMode`         | `default`            | Active agent mode ID.                                  |
| `openrouterAgent.agentConfigScope`  | `workspace`          | Where project customization data is stored.            |
| `openrouterAgent.toolPermissions`   | see defaults         | Per-tool approval mode.                                |

Future documentation builds can generate this table from `package.json` so it stays synchronized with the extension manifest.
