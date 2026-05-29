---
title: Инструменты и безопасность
description: Workspace tools, permissions и границы безопасности.
---

AIST показывает каждый tool call в чате с короткой причиной.

| Инструмент        | Назначение                       | Права по умолчанию |
| ----------------- | -------------------------------- | ------------------ |
| `list_files`      | Показывает файлы и директории.   | `auto`             |
| `read_file`       | Читает UTF-8 текстовый файл.     | `auto`             |
| `grep_search`     | Ищет текст или regex.            | `auto`             |
| `run_bash_script` | Запускает focused Bash script.   | `ask`              |
| `write_file`      | Создаёт или перезаписывает файл. | `ask`              |
| `replace_in_file` | Заменяет точный текст в файле.   | `ask`              |
| `delete_path`     | Удаляет файл или директорию.     | `ask`              |
| `run_skill`       | Запускает custom skill.          | Настройка навыка   |

Все пути workspace-relative и не должны выходить за пределы текущего workspace.
