# User guide

[Русская документация](ru/user-guide.md)

## Opening AIST

AIST contributes an Activity Bar container named `aist`. It contains the `Chats` webview.

Available commands:

- `aist: Open Chat` — opens the sidebar chat view.
- `aist: New Chat` — creates a new chat.
- `aist: Open Chat in Editor` — opens the current or selected chat as an editor panel.
- `aist: Settings` — opens the AIST settings UI.
- `aist: Open AIST Storage` — opens the workspace `.aist-agent` daemon storage on disk.
- `aist: Edit Selection` — asks for an instruction and replaces the current selection with model output.
- `aist: Show Logs` — opens the extension log output.
- `aist: Login ChatGPT Codex` / `aist: Logout ChatGPT Codex` — manages Codex authorization.

## Chat workflow

1. Open `aist` from the Activity Bar or run `aist: Open Chat`.
2. Create a chat with `aist: New Chat` or the new-chat button.
3. Select a model in the composer.
4. Optionally select code or open a file you want to discuss.
5. Send a prompt.
6. Review tool activity and approve risky actions when requested.

While a request is running, the composer shows the current activity. You can stop the request from the composer; pending approvals are denied and the model request is aborted.

## Editor context

Every request automatically includes context from the active editor:

- If there is selected text, AIST sends the selected code.
- If there is no selection, AIST sends the active file content.
- The file content is truncated by `openrouterAgent.maxContextChars` (default: `12000`).
- The context also includes the absolute file path and VS Code language ID.

This means you usually do not need to paste file content manually. Open or select the relevant code before sending the prompt.

## Markdown messages

Assistant messages are rendered as Markdown with GitHub-flavored Markdown support. Each text message has a copy button that copies the original Markdown.

## Chat list actions

Chats can be:

- selected from the sidebar list;
- opened in a separate editor panel;
- duplicated;
- deleted, unless the chat is currently running;
- compacted manually.

If a deleted chat is open in multiple surfaces, AIST retargets those surfaces to the next available chat.

## Chat compaction

AIST can summarize a long chat into a new handoff chat. The summary preserves goals, decisions, constraints, changed files, commands, current status, open tasks, and important errors.

Compaction can happen in two ways:

- **Automatically** when enabled and the estimated context usage reaches the configured threshold.
- **Manually** from the chat UI.

Default compaction settings:

- enabled: `true`;
- threshold: `70%`;
- keep last messages: `0`.

## `Edit Selection`

The command `aist: Edit Selection` is useful for small direct transformations.

1. Select code in the editor, or place the cursor where generated text should be inserted.
2. Run `aist: Edit Selection`.
3. Enter an instruction.
4. AIST calls the configured model and replaces the selection, or inserts text at the cursor if the selection is empty.

The command strips a single surrounding Markdown code fence from the model output before inserting the result.

## Models

AIST supports two provider families:

- **OpenRouter**: model IDs are used as-is, for example `openai/gpt-4o-mini`.
- **ChatGPT Codex**: model IDs use the `codex:` prefix, for example `codex:gpt-5.1-codex`.

The model selector groups OpenRouter and Codex models separately. OpenRouter models are loaded from the OpenRouter Models API; Codex models require successful Codex login.

## Reasoning effort

The composer and settings UI expose `reasoningEffort`:

- `auto` — do not send a reasoning parameter;
- `low`;
- `medium`;
- `high`.

This value is sent to OpenRouter when supported by the selected model/provider.

## Usage and cost estimates

AIST estimates token usage and cost for chat messages using model metadata when available. The UI can show:

- prompt tokens;
- completion tokens;
- total tokens;
- estimated USD cost;
- current context estimate and context percentage.

These are estimates, not billing guarantees.
