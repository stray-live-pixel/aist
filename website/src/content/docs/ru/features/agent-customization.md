---
title: Настройка агента
description: Project instructions, режимы и custom skills.
---

AIST собирает prompt из нескольких источников:

1. base system prompt;
2. внешние файлы инструкций `AGENTS.md` и `CLAUDE.md`;
3. project instructions;
4. активный agent mode;
5. список custom skills.

Project instructions подходят для соглашений репозитория, команд, архитектурных заметок и предпочтений.

Встроенные режимы:

- `default` — практичная работа;
- `careful` — более осторожный workflow.

Custom skills — пользовательские Bash-команды, доступные агенту через `run_skill`.
