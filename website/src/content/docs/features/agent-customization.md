---
title: Agent customization
description: Project instructions, modes, and custom skills.
---

AIST builds the agent prompt from several instruction sources on every request:

1. base system prompt;
2. external instruction files such as `AGENTS.md` and `CLAUDE.md`;
3. project instructions;
4. active agent mode;
5. custom skills list.

## Project instructions

Project instructions are edited from AIST settings. Use them for repository conventions, commands, architecture notes, and preferences.

Depending on `openrouterAgent.agentConfigScope`, data is stored in `.aist-agent/settings.json` or VS Code global storage.

## Agent modes

Built-in modes include:

- `default` — practical day-to-day work;
- `careful` — more cautious workflow with smaller changes and clearer explanations.

You can add custom modes from the settings UI.

## Custom skills

Custom skills expose user-defined Bash commands to the agent through `run_skill`. Skills receive input through stdin and the `AIST_SKILL_INPUT` environment variable.
