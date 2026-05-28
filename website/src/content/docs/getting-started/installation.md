---
title: Installation
description: Install AIST from GitHub or from local source.
---

## Requirements

- VS Code `1.90.0` or newer.
- The `code` command-line tool in `PATH` for script-based installation.
- An OpenRouter API key or ChatGPT Codex authorization.

## Install from GitHub

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/stray-live-pixel/aist/main/scripts/install-from-github.sh)
```

For VS Code Insiders:

```bash
VSCODE_CLI=code-insiders bash <(curl -fsSL https://raw.githubusercontent.com/stray-live-pixel/aist/main/scripts/install-from-github.sh)
```

To install a specific version:

```bash
AIST_VERSION=0.0.2 bash <(curl -fsSL https://raw.githubusercontent.com/stray-live-pixel/aist/main/scripts/install-from-github.sh)
```

## Configure OpenRouter

Store your API key in the CLI/global secret store:

```bash
aist auth openrouter set-key
```

Or provide it through the environment:

```bash
export OPENROUTER_API_KEY=sk-or-...
```

## Configure ChatGPT Codex

1. Run **aist: Login ChatGPT Codex** in VS Code.
2. Finish the authorization flow.
3. Select a model with the `codex:` prefix, for example `codex:gpt-5.1-codex`.
