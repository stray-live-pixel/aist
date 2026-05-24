# aist documentation

[Русская документация](ru/README.md)

AIST is a VS Code extension that adds a coding-agent chat to the editor. It can use OpenRouter models or ChatGPT Codex models, inspect the current workspace, ask for approval before risky actions, and edit files through VS Code-native diff previews.

## Documentation map

- [Installation](installation.md)
- [User guide](user-guide.md)
- [Configuration](configuration.md)
- [Tools, approvals, and safety](tools-and-safety.md)
- [Agent instructions, modes, and skills](agent-customization.md)
- [Development and release](development.md)

## Quick start

1. Install the extension from GitHub:

   ```bash
   bash <(curl -fsSL https://raw.githubusercontent.com/stray-live-pixel/aist/main/scripts/install-from-github.sh)
   ```

2. Configure an OpenRouter API key in VS Code settings or through `OPENROUTER_API_KEY`:

   ```json
   {
     "openrouterAgent.apiKey": "sk-or-...",
     "openrouterAgent.model": "openai/gpt-4o-mini",
     "openrouterAgent.language": "en"
   }
   ```

3. Open the `aist` Activity Bar item, create or select a chat, and ask a question.

For ChatGPT Codex models, run `aist: Login ChatGPT Codex` and then select a `codex:` model in the model selector.

## Main concepts

- **Chats** are stored by the extension and can be created, duplicated, deleted, compacted, or opened in editor panels.
- **Models** can come from OpenRouter or ChatGPT Codex. OpenRouter model IDs are used as-is; Codex model IDs use the `codex:` prefix.
- **Editor context** is attached automatically. If code is selected, the selected text is sent; otherwise AIST sends the active file content up to `openrouterAgent.maxContextChars`.
- **Tools** let the agent inspect the workspace, search files, run focused Bash scripts, and change files.
- **Approvals** protect risky operations. Read/search tools run automatically by default; shell commands and mutations require confirmation by default.
- **Instructions and modes** customize the system prompt per project or user.
- **Skills** are user-defined shell commands exposed to the agent through the `run_skill` tool.

## Language

The default response language is English (`openrouterAgent.language: "en"`). You can switch to Russian in settings. This documentation always links to the Russian version at the top of every page.
