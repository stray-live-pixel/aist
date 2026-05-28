# Инструменты, подтверждения и безопасность

[English documentation](../tools-and-safety.md)

## Список инструментов

| Инструмент           | Назначение                                                                      | Права по умолчанию                |
| -------------------- | ------------------------------------------------------------------------------- | --------------------------------- |
| `get_workspace_info` | Возвращает имя/путь workspace и метаданные активного редактора.                 | `auto`                            |
| `list_files`         | Показывает файлы и директории по workspace-relative пути.                       | `auto`                            |
| `read_file`          | Читает UTF-8 текстовый файл.                                                    | `auto`                            |
| `grep_search`        | Ищет текст или JavaScript regex в файлах.                                       | `auto`                            |
| `run_bash_script`    | Запускает focused Bash script внутри workspace.                                 | `ask`                             |
| `write_file`         | Создает или перезаписывает UTF-8 файл.                                          | `ask`                             |
| `replace_in_file`    | Заменяет точный текст в существующем UTF-8 файле.                               | `ask`                             |
| `apply_patch`        | Применяет unified diff patch к текстовым файлам workspace.                      | `ask`                             |
| `create_directory`   | Создает директорию, включая родителей.                                          | `ask`                             |
| `delete_path`        | Удаляет файл или директорию через trash; для директорий нужен `recursive=true`. | `ask`                             |
| `run_skill`          | Запускает пользовательский custom skill.                                        | Права навыка, по умолчанию `ask`. |

## Approval flow

Если permission инструмента равен `ask`, AIST добавляет inline-карточку подтверждения в чат и ждет решения пользователя.

- Approve запускает инструмент.
- Deny возвращает агенту отклоненный результат.
- Stop отклоняет pending approvals и прерывает текущий run.

Read-only инструменты по умолчанию `auto`. Shell-команды и мутации по умолчанию `ask`.

## Diff preview для изменений

Перед записью файлов AIST открывает нативный VS Code diff preview:

- `write_file` показывает полный целевой content;
- `replace_in_file` показывает generated replacement;
- `apply_patch` показывает каждый измененный файл из unified diff;
- карточка подтверждения остается в чате, пока diff editor открыт параллельно.

Файл изменяется только после подтверждения.

## Границы workspace

Все пути инструментов должны быть workspace-relative и резолвятся внутри текущего workspace. Поиск и листинг пропускают распространенные generated/служебные директории:

- `.git`;
- `node_modules`;
- `dist`;
- `out`;
- `.vscode-test`.

## `run_bash_script`

Shell execution предназначен для тестов, сборок, диагностики и безопасных инспекций.

Лимиты:

- timeout по умолчанию: `30000` ms;
- минимум: `1000` ms;
- максимум: `120000` ms;
- лимит output по умолчанию: `20000` символов на stream;
- максимум output: `100000` символов на stream.

Команда запускается как `bash -lc` в workspace-relative `cwd` и наследует окружение процесса расширения VS Code.

## `grep_search`

Опции поиска:

- `query` — текст или regex pattern;
- `path` — workspace-relative файл или директория, по умолчанию `.`;
- `include` — glob pattern, по умолчанию `**/*`;
- `regex` — воспринимать `query` как JavaScript regex;
- `caseSensitive` — учитывать регистр;
- `contextLines` — от 0 до 5 строк контекста;
- `beforeLines` / `afterLines` — от 0 до 5 строк асимметричного контекста, по умолчанию `contextLines`;
- `filesOnly` — вернуть только уникальные paths с совпадениями;
- `countOnly` — вернуть paths с количеством совпадений без текста строк;
- `exclude` — дополнительный glob pattern вместе со стандартными ignored директориями;
- `maxResults` — от 1 до 1000 совпадений или paths в compact-режимах;
- `maxFiles` — от 1 до 10000.

Binary files и файлы больше 1 MiB пропускаются.

## Защита от повторяющихся tool calls

Agent loop отслеживает повторяющиеся tool calls. Если модель повторяет один и тот же вызов, AIST останавливает повторяющийся цикл и возвращает краткий ответ вместо бесконечного loop.

## Лимит tool iterations

`openrouterAgent.maxToolIterations` ограничивает число model/tool-call циклов на запрос. `0` означает отсутствие настроенного лимита. При достижении лимита AIST завершает run сообщением о лимите.
