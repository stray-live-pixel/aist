# Agent customization

[Русская документация](ru/agent-customization.md)

AIST builds the system prompt from several instruction sources on every request. The prompt is not cached, so changes to settings, modes, project instructions, or skills are picked up by the next message.

## Instruction order

Instruction sources are sorted by priority:

1. **Base system prompt** — core coding-agent rules, language policy, and tool usage rules.
2. **External instruction files** — currently `AGENTS.md` and `CLAUDE.md` if present in the workspace root.
3. **Project instructions** — text stored by AIST settings.
4. **Active agent mode** — selected mode instructions.
5. **Custom skills list** — skill IDs, labels, and descriptions exposed to the model.

The chat UI shows effective instruction sources so the user can see what is active.

## Base rules

The base prompt tells the agent to:

- work inside VS Code;
- use workspace-relative paths;
- provide a short `reason` for every tool call;
- answer and write tool reasons in the configured language;
- use `grep_search` for finding symbols or related files;
- use `run_bash_script` for focused tests/builds/diagnostics;
- read relevant files before editing;
- preserve project style;
- avoid repeating identical tool calls;
- verify successful edits at most once when useful;
- keep final answers concise and mention changed files.

## Project instructions

Project instructions are edited from AIST settings → **Instructions**.

Depending on `openrouterAgent.agentConfigScope`, they are stored in either:

- `.aist-agent/settings.json` in the workspace; or
- VS Code extension global storage for the current workspace.

Use project instructions for repository-specific conventions, commands, architecture notes, and preferences.

Example:

```text
Prefer small TypeScript changes. Run npm run typecheck after code edits when practical. Do not modify generated files.
```

## Agent modes

AIST includes built-in modes:

| ID        | Label      | Purpose                                                                             |
| --------- | ---------- | ----------------------------------------------------------------------------------- |
| `default` | Обычный    | Short, practical work; inspect relevant files before edits; preserve project style. |
| `careful` | Осторожный | More cautious workflow; prefer small changes; explain what changed.                 |

Modes can be selected from the chat summary controls or from settings.

The settings UI lets you:

- change the active mode;
- edit instructions for the active mode;
- add custom modes.

Custom mode IDs are generated from their labels. Built-in modes cannot be deleted.

## Custom skills

Custom skills expose user-defined shell commands to the agent through the `run_skill` tool.

Each skill has:

- `id` — generated from the label;
- `label`;
- `description`;
- `command`;
- `permission`: `ask` or `auto`.

Skills default to `ask` permission.

## Skill execution

When the model calls `run_skill`, AIST runs the configured command through Bash from a workspace-relative directory.

The skill receives input in two ways:

- stdin;
- `AIST_SKILL_INPUT` environment variable.

Additional environment variables:

- `AIST_SKILL_ID`;
- `AIST_SKILL_LABEL`.

The result includes stdout, stderr, exit code, timeout status, duration, and truncation flags.

## Example skill

A skill for TypeScript checking:

- Name: `Typecheck`
- Description: `Run the TypeScript compiler without emitting files.`
- Command:

  ```bash
  npm run typecheck
  ```

- Permission: `ask`

The model can then call `run_skill` with `skillId: "typecheck"` when type checking is useful.

## Storage format

When using workspace scope, AIST writes customization data to `.aist-agent/settings.json`. The file may contain:

```json
{
  "projectInstructions": "Prefer simple implementations.",
  "modeInstructions": {
    "default": "Work briefly and practically."
  },
  "customModes": [
    {
      "id": "frontend",
      "label": "Frontend",
      "instructions": "Focus on UI consistency and accessibility."
    }
  ],
  "customSkills": [
    {
      "id": "typecheck",
      "label": "Typecheck",
      "description": "Run TypeScript checks.",
      "command": "npm run typecheck",
      "permission": "ask"
    }
  ]
}
```
