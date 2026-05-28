---
title: Providers and authorization
description: Configure OpenRouter and ChatGPT Codex.
---

## OpenRouter

Store the API key in the CLI/global secret store:

```bash
aist auth openrouter set-key
```

Or set:

```bash
export OPENROUTER_API_KEY=sk-or-...
```

Optional OpenRouter ranking metadata is configured through `openrouterAgent.siteUrl` and `openrouterAgent.siteName`.

## ChatGPT Codex

Use VS Code commands:

- **aist: Login ChatGPT Codex**;
- **aist: Logout ChatGPT Codex**.

Codex model IDs use the `codex:` prefix.
