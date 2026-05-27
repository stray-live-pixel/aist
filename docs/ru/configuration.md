# Конфигурация

[English documentation](../configuration.md)

Настройки AIST используют namespace `openrouterAgent.*`.

## Основные настройки

```json
{
  "openrouterAgent.apiKey": "sk-or-...",
  "openrouterAgent.model": "openai/gpt-4o-mini",
  "openrouterAgent.language": "en"
}
```

| Настройка                           | Значение по умолчанию  | Описание                                                                                       |
| ----------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------- |
| `openrouterAgent.apiKey`            | `""`                   | OpenRouter API key. Также можно использовать `OPENROUTER_API_KEY`.                             |
| `openrouterAgent.model`             | `"openai/gpt-4o-mini"` | ID активной модели. OpenRouter ID используются как есть; Codex ID используют префикс `codex:`. |
| `openrouterAgent.siteUrl`           | `""`                   | Опциональный site URL для OpenRouter rankings headers.                                         |
| `openrouterAgent.siteName`          | `"aist"`               | Опциональное site name для OpenRouter rankings headers.                                        |
| `openrouterAgent.maxContextChars`   | `12000`                | Максимум символов активного файла, добавляемых как editor context.                             |
| `openrouterAgent.maxToolIterations` | `0`                    | Максимум циклов model/tool-call на запрос. `0` — без настроенного лимита.                      |
| `openrouterAgent.reasoningEffort`   | `"auto"`               | Reasoning effort для OpenRouter: `auto`, `low`, `medium`, `high`.                              |
| `openrouterAgent.language`          | `"en"`                 | Язык ответов агента и `reason` у tool calls: `en` или `ru`.                                    |
| `openrouterAgent.agentMode`         | `"default"`            | ID активного режима агента.                                                                    |
| `openrouterAgent.agentConfigScope`  | `"workspace"`          | Где хранятся project instructions, custom modes, skills и compaction settings.                 |

> Если workspace уже содержит старую пользовательскую настройку языка, задайте `openrouterAgent.language` явно.

## Agent config scope

`openrouterAgent.agentConfigScope` управляет местом хранения кастомизации:

- `workspace` — `.aist-agent/settings.json` в текущем workspace; файл можно коммитить при необходимости.
- `user` — глобальное хранилище расширения VS Code для текущего workspace.

## Права инструментов

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
    "apply_patch": "ask",
    "create_directory": "ask",
    "delete_path": "ask"
  }
}
```

Значения:

- `auto` — запуск без ручного подтверждения;
- `ask` — показать карточку подтверждения в чате.

Пресеты UI:

| Пресет       | Поведение                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------ |
| `balanced`   | Чтение/поиск автоматически; shell-команды и мутации — с подтверждением.                          |
| `fast-edit`  | Чтение/поиск/создание/редактирование автоматически; shell-команды и удаление — с подтверждением. |
| `autonomous` | Все доступные инструменты запускаются автоматически.                                             |
| `custom`     | Показывается, когда текущие права не совпадают с пресетом.                                       |

## Язык агента

Настройка языка влияет на:

- финальные ответы ассистента;
- каждый аргумент `reason` у tool calls.

Поддерживаются:

- `en` — English;
- `ru` — русский.

Дефолтный язык проекта — English.

## Настройки сжатия

Сжатие хранится в активном agent config scope. Значения по умолчанию:

```json
{
  "enabled": true,
  "thresholdPercent": 70,
  "keepLastMessages": 0
}
```

Ограничения:

- `thresholdPercent`: от `10` до `95`;
- `keepLastMessages`: от `0` до `20`.

## Codex authorization

Авторизация Codex управляется командами или страницей System в настройках:

- `aist: Login ChatGPT Codex`;
- `aist: Logout ChatGPT Codex`.
