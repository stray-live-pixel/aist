# aist

Minimal VS Code extension MVP for coding with OpenRouter models, TypeScript, React, Tailwind CSS, and `lucide-react`.

## Features

- Activity Bar icon opens the `Chats` sidebar view.
- Clicking a chat in the sidebar opens the React chat panel.
- `aist: New Chat` creates a new chat.
- The chat automatically includes the active file or selected code as context.
- Messages render Markdown with GitHub-flavored Markdown support.
- Every text message has a copy button that copies the original Markdown.
- The composer has a searchable model selector loaded from the OpenRouter Models API.
- File edits are previewed with VS Code's native diff editor before the tool writes changes.
- Agent settings can be managed in the webview:
  - Tool iteration limit defaults to `0`, which means no limit.
  - `ask` requires user confirmation before the tool runs.
  - `auto` lets the tool run automatically.
  - File-reading tools default to `auto`.
  - Mutating tools default to `ask`.
- Every tool call includes the model's short reason in chat history, even when the tool is allowed automatically.
- The agent can call workspace filesystem tools:
  - `get_workspace_info`
  - `list_files`
  - `read_file`
  - `grep_search`
  - `write_file`
  - `replace_in_file`
  - `create_directory`
  - `delete_path`
- Tool paths are constrained to the first VS Code workspace folder.
- `aist: Edit Selection` asks for an instruction and replaces the current selection with model output.
- `Insert Last Answer` inserts the latest chat answer into the active editor.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set your API key in VS Code settings:

   ```json
   {
     "openrouterAgent.apiKey": "sk-or-...",
     "openrouterAgent.model": "openai/gpt-4o-mini"
   }
   ```

   You can also use the `OPENROUTER_API_KEY` environment variable.

3. Run the extension from VS Code:

   - Open this folder in VS Code.
   - Press `F5`.
   - In the Extension Development Host, run `aist: Open Chat`.

## Package

```bash
npm run package
```

This creates a `.vsix` file that can be installed locally.

## Install locally

```bash
npm run install:extension
```

This builds the extension, writes `dist/aist-0.0.1.vsix`, and installs it with the `code` CLI. Use `VSCODE_CLI=code-insiders npm run install:extension` for VS Code Insiders.

## Development

```bash
npm run build
```

The extension host entrypoint is `src/extension.ts`.

The webview follows a lightweight FSD layout:

- `src/webview/app`
- `src/webview/pages`
- `src/webview/widgets`
- `src/webview/features`
- `src/webview/entities`
- `src/webview/shared`

Tailwind uses VS Code theme variables such as `--vscode-editor-background`, `--vscode-button-background`, and `--vscode-foreground` so the UI follows the active editor theme.
