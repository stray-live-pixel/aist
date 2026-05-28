---
title: Choosing a model
description: How AIST uses OpenRouter and ChatGPT Codex models.
---

AIST supports two model families.

## OpenRouter

OpenRouter model IDs are used as-is, for example:

```text
openai/gpt-4o-mini
```

Use OpenRouter when you want broad model choice through one provider.

## ChatGPT Codex

Codex model IDs use the `codex:` prefix, for example:

```text
codex:gpt-5.1-codex
```

Codex models require successful Codex login through **aist: Login ChatGPT Codex**.

## Reasoning effort

The composer and settings expose `reasoningEffort`:

- `auto` — do not send a reasoning parameter;
- `low`;
- `medium`;
- `high`.

For OpenRouter, AIST sends the value when the selected model/provider supports it.
