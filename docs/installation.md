# Installation

[Русская документация](ru/installation.md)

## Requirements

- VS Code `1.90.0` or newer.
- The `code` command-line tool available in `PATH` for script-based installation.
- An OpenRouter API key for OpenRouter models, or ChatGPT Codex authorization for `codex:` models.

## Install from GitHub

Run:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/stray-live-pixel/aist/main/scripts/install-from-github.sh)
```

The script downloads `releases/aist-latest.vsix` from the GitHub repository, installs it through the VS Code CLI, and restarts VS Code automatically.

For VS Code Insiders:

```bash
VSCODE_CLI=code-insiders bash <(curl -fsSL https://raw.githubusercontent.com/stray-live-pixel/aist/main/scripts/install-from-github.sh)
```

Install a specific version:

```bash
AIST_VERSION=0.0.2 bash <(curl -fsSL https://raw.githubusercontent.com/stray-live-pixel/aist/main/scripts/install-from-github.sh)
```

If `curl` is unavailable, clone the repository and run:

```bash
bash scripts/install-from-github.sh
```

## Configure OpenRouter

Store the API key in the CLI/global secret store:

```bash
aist auth openrouter set-key
```

Then set the default model if needed:

```json
{
  "openrouterAgent.model": "openai/gpt-4o-mini",
  "openrouterAgent.language": "en"
}
```

You can also set the API key through the environment variable:

```bash
export OPENROUTER_API_KEY=sk-or-...
```

Optional OpenRouter ranking metadata:

```json
{
  "openrouterAgent.siteUrl": "https://example.com",
  "openrouterAgent.siteName": "aist"
}
```

## Configure ChatGPT Codex

1. Run the VS Code command `aist: Login ChatGPT Codex`.
2. Finish authorization in the flow opened by the extension.
3. Pick a `codex:` model in the model selector, for example `codex:gpt-5.1-codex`.

To disconnect, run `aist: Logout ChatGPT Codex` or use the System section in AIST settings.

## Install locally from source

```bash
npm install
npm run install:extension
```

This builds the extension, creates a VSIX artifact, and installs it with the `code` CLI.

For VS Code Insiders:

```bash
VSCODE_CLI=code-insiders npm run install:extension
```

## Run in Extension Development Host

1. Open the repository in VS Code.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Press `F5`.
4. In the Extension Development Host, run `aist: Open Chat` or open the `aist` Activity Bar item.
