# Инструкции, режимы и навыки агента

[English documentation](../agent-customization.md)

## Порядок инструкций

Источники инструкций сортируются по priority:

1. **Base system prompt** — базовые правила coding-agent, языковая политика и правила tool usage.
2. **External instruction files** — `AGENTS.md` и `CLAUDE.md` в корне workspace, если они есть.
3. **Project instructions** — текст, сохраненный через настройки AIST.
4. **Active agent mode** — инструкции выбранного режима.
5. **Custom skills list** — ID, названия и описания навыков, доступные модели.

UI показывает effective instruction sources, чтобы пользователь видел активные правила.

## Базовые правила

Base prompt просит агента:

- работать внутри VS Code;
- использовать workspace-relative paths;
- добавлять короткий `reason` к каждому tool call;
- отвечать и писать `reason` на выбранном языке;
- использовать `grep_search` для поиска символов и связанных файлов;
- использовать `run_bash_script` для focused tests/builds/diagnostics;
- читать релевантные файлы перед изменениями;
- сохранять стиль проекта;
- не повторять одинаковые tool calls;
- после успешных правок проверять не более одного раза, когда это полезно;
- писать краткий финальный ответ и упоминать измененные файлы.

## Project instructions

Project instructions редактируются в AIST settings → **Instructions**.

В зависимости от `openrouterAgent.agentConfigScope` они хранятся:

- в `.aist-agent/settings.json` внутри workspace;
- или в глобальном хранилище расширения VS Code для текущего workspace.

Используйте их для repository-specific соглашений, команд, архитектурных заметок и предпочтений.

Пример:

```text
Prefer small TypeScript changes. Run npm run typecheck after code edits when practical. Do not modify generated files.
```

## Agent modes

Встроенные режимы:

| ID        | Label      | Назначение                                                                                         |
| --------- | ---------- | -------------------------------------------------------------------------------------------------- |
| `default` | Обычный    | Краткая и практичная работа; изучать релевантные файлы перед изменениями; сохранять стиль проекта. |
| `careful` | Осторожный | Более осторожный workflow; маленькие изменения; объяснять, что изменено.                           |

Режим можно выбрать в summary controls чата или в настройках.

UI настроек позволяет:

- сменить активный режим;
- редактировать инструкции активного режима;
- добавлять custom modes.

ID custom mode генерируется из label. Built-in режимы нельзя удалить.

## Custom skills

Custom skills — пользовательские shell-команды, доступные агенту через tool `run_skill`.

Skill содержит:

- `id` — генерируется из label;
- `label`;
- `description`;
- `command`;
- `permission`: `ask` или `auto`.

По умолчанию skill требует `ask`.

## Выполнение навыка

Когда модель вызывает `run_skill`, AIST запускает команду через Bash из workspace-relative директории.

Input передается:

- через stdin;
- через переменную окружения `AIST_SKILL_INPUT`.

Дополнительные переменные:

- `AIST_SKILL_ID`;
- `AIST_SKILL_LABEL`.

Результат включает stdout, stderr, exit code, timeout status, duration и flags усечения вывода.

## Пример навыка

Навык для TypeScript check:

- Name: `Typecheck`
- Description: `Run the TypeScript compiler without emitting files.`
- Command:

  ```bash
  npm run typecheck
  ```

- Permission: `ask`

Модель сможет вызвать `run_skill` с `skillId: "typecheck"`, когда type checking полезен.

## Формат хранения

При workspace scope AIST пишет кастомизацию в `.aist-agent/settings.json`:

```json
{
  "projectInstructions": "Prefer simple implementations.",
  "modeInstructions": {
    "default": "Work briefly and practically."
  },
  "customSkills": []
}
```
