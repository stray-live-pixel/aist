# Development and release

[Русская документация](ru/development.md)

## Tech stack

- VS Code extension API.
- TypeScript.
- React webview UI.
- Tailwind CSS and SCSS modules.
- `lucide-react` icons.
- esbuild for extension and webview bundles.
- Storybook for UI development.
- Vitest and Playwright for tests.

## Repository layout

```text
src/
  extension.ts                 # VS Code activation and command registration
  extension/
    agent/                     # agent controller, runtime, config, webview handlers
    chats/                     # chat storage and chat domain types
    codex/                     # ChatGPT Codex client
    openrouter/                # OpenRouter client and types
    skills/                    # custom skills
    tools/                     # filesystem tools and permissions
  webview/                     # React webview application
scripts/                       # build and install scripts
media/                         # VS Code contribution assets
assets/                        # application assets
```

The webview follows a lightweight feature-sliced layout:

- `src/webview/app`
- `src/webview/pages`
- `src/webview/widgets`
- `src/webview/features`
- `src/webview/entities`
- `src/webview/shared`

## Install dependencies

```bash
npm install
```

## Build

```bash
npm run build
```

Build flow:

1. `npm run typecheck` validates TypeScript.
2. `npm run build:extension` bundles `src/extension.ts` to `dist/extension.js`.
3. `npm run build:webview` bundles the React webview and Tailwind CSS to `dist/`.

## Tests and checks

```bash
npm run typecheck
npm run test
npm run test:e2e
npm run format:check
```

E2E tests build the extension and webview before running Playwright.

## Storybook

```bash
npm run storybook
npm run build:storybook
```

Storybook uses fixtures from `src/webview/storybook/fixtures.ts`.

## Package VSIX

```bash
npm run package
```

This runs the full build and then creates a `.vsix` package with `vsce package --no-dependencies`.

## Install locally

```bash
npm run install:extension
```

For VS Code Insiders:

```bash
VSCODE_CLI=code-insiders npm run install:extension
```

## Release a new version

1. Update `version` in `package.json` and `package-lock.json`.
2. Build a versioned VSIX into `releases/`:

   ```bash
   npm install
   npm run package -- --out releases/aist-<version>.vsix
   ```

3. Update the stable artifact:

   ```bash
   cp releases/aist-<version>.vsix releases/aist-latest.vsix
   ```

4. Check artifacts:

   ```bash
   ls -lh releases/aist-<version>.vsix releases/aist-latest.vsix
   git status --short releases/aist-<version>.vsix releases/aist-latest.vsix
   ```

5. Commit and push:

   ```bash
   git add package.json package-lock.json README.md docs releases/aist-<version>.vsix releases/aist-latest.vsix
   git commit -m "Release aist <version>"
   git push origin main
   ```

6. Verify install from GitHub on a clean machine:

   ```bash
   bash <(curl -fsSL https://raw.githubusercontent.com/stray-live-pixel/aist/main/scripts/install-from-github.sh)
   ```

## Logging

Run `aist: Show Logs` to open extension logs. Useful events include chat creation, webview resolution, model refresh, agent run start/finish, tool execution, Codex auth state, and compaction failures.

## UI theme integration

The webview uses VS Code theme variables such as:

- `--vscode-editor-background`;
- `--vscode-button-background`;
- `--vscode-foreground`;
- `--vscode-descriptionForeground`.

This keeps the UI aligned with the active VS Code theme.
