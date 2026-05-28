---
title: FAQ
description: Common questions about AIST.
---

## Does AIST edit files automatically?

Mutating tools ask for confirmation by default. File edits are previewed in VS Code diff editors before they are applied.

## Do I need to paste file contents into chat?

Usually no. Open the relevant file or select relevant code before sending the prompt.

## Where are API keys stored?

OpenRouter keys are stored in the CLI/global secret store or provided through `OPENROUTER_API_KEY`. Workspace settings should not contain secrets.

## Can I use ChatGPT Codex models?

Yes. Run **aist: Login ChatGPT Codex** and choose a model with the `codex:` prefix.
