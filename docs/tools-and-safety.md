# Tools, approvals, and safety

[Русская документация](ru/tools-and-safety.md)

AIST exposes workspace tools to the model. Each tool call is shown in chat with a short `reason` written by the model. Tool paths must be workspace-relative and are constrained to the first VS Code workspace folder.

## Tool list

| Tool                 | Purpose                                                                        | Default permission                   |
| -------------------- | ------------------------------------------------------------------------------ | ------------------------------------ |
| `get_workspace_info` | Returns workspace name/path and active editor metadata.                        | `auto`                               |
| `list_files`         | Lists files/directories under a workspace-relative path.                       | `auto`                               |
| `read_file`          | Reads a UTF-8 text file.                                                       | `auto`                               |
| `grep_search`        | Searches files for text or a JavaScript regex.                                 | `auto`                               |
| `run_bash_script`    | Runs a focused Bash script from inside the workspace.                          | `ask`                                |
| `write_file`         | Creates or overwrites a UTF-8 file.                                            | `ask`                                |
| `replace_in_file`    | Replaces exact text in an existing UTF-8 file.                                 | `ask`                                |
| `create_directory`   | Creates a directory, including parents.                                        | `ask`                                |
| `delete_path`        | Deletes a file or directory using trash; directories require `recursive=true`. | `ask`                                |
| `run_skill`          | Runs a user-defined custom skill.                                              | Per-skill permission, default `ask`. |

## Approval flow

When a tool permission is `ask`, AIST adds an inline approval card to chat and waits for the user decision.

- Approving runs the tool.
- Denying returns a denied result to the agent.
- Stopping the request denies pending approvals and aborts the current run.

Read-only tools use `auto` by default. Shell commands and file mutations use `ask` by default.

## Diff preview for edits

Before mutating file tools write changes, AIST opens a VS Code-native diff preview:

- `write_file` previews the full target content.
- `replace_in_file` previews the generated replacement.
- The approval card stays in chat while the diff editor remains open in parallel.

Only after approval does the tool write the changes.

## Workspace boundaries

All tool paths are resolved relative to the current workspace. AIST rejects paths outside the workspace through workspace path resolution.

Search/list behavior also skips common generated or irrelevant directories, including:

- `.git`;
- `node_modules`;
- `dist`;
- `out`;
- `.vscode-test`.

## `run_bash_script`

Use shell execution for tests, builds, diagnostics, and safe inspections.

Runtime limits:

- default timeout: `30000` ms;
- minimum timeout: `1000` ms;
- maximum timeout: `120000` ms;
- default output cap: `20000` characters per stream;
- maximum output cap: `100000` characters per stream.

The command runs through `bash -lc` in a workspace-relative `cwd` and inherits the VS Code extension process environment.

## `grep_search`

Search options:

- `query` — text or regex pattern;
- `path` — workspace-relative file or directory, default `.`;
- `include` — glob pattern, default `**/*`;
- `regex` — treat `query` as JavaScript regex;
- `caseSensitive` — case-sensitive matching;
- `contextLines` — 0 to 5 context lines;
- `maxResults` — 1 to 1000;
- `maxFiles` — 1 to 10000.

Binary files and files larger than 1 MiB are skipped.

## Repeated tool-call protection

The agent loop tracks repeated tool calls. If the model keeps making the same call, AIST stops the repeated loop and returns a concise assistant answer instead of looping indefinitely.

## Tool iteration limit

`openrouterAgent.maxToolIterations` limits model/tool-call turns per request. `0` means no configured limit. If the limit is reached, AIST stops the run with a message explaining that the agent reached the tool iteration limit.
