---
title: Tools and safety
description: Workspace tools, permissions, and safety boundaries.
---

AIST exposes workspace tools to the model. Each tool call is shown in chat with a short reason.

Common tools include:

| Tool              | Purpose                                   | Default permission |
| ----------------- | ----------------------------------------- | ------------------ |
| `list_files`      | Lists files and directories.              | `auto`             |
| `read_file`       | Reads a UTF-8 text file.                  | `auto`             |
| `grep_search`     | Searches files for text or regex matches. | `auto`             |
| `run_bash_script` | Runs a focused Bash script.               | `ask`              |
| `write_file`      | Creates or overwrites a file.             | `ask`              |
| `replace_in_file` | Replaces exact text in a file.            | `ask`              |
| `delete_path`     | Deletes a file or directory.              | `ask`              |
| `run_skill`       | Runs a custom user-defined skill.         | Per-skill setting  |

All paths are workspace-relative and resolved inside the current workspace. Search and listing skip common generated directories such as `.git`, `node_modules`, `dist`, and `out`.
