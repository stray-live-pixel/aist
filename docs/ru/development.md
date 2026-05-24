# Разработка и релиз

[English documentation](../development.md)

## Стек

- VS Code extension API.
- TypeScript.
- React webview UI.
- Tailwind CSS и SCSS modules.
- `lucide-react` icons.
- esbuild для extension и webview bundles.
- Storybook для UI разработки.
- Vitest и Playwright для тестов.

## Структура репозитория

```text
src/
  extension.ts                 # VS Code activation и регистрация команд
  extension/
    agent/                     # agent controller, runtime, config, webview handlers
    chats/                     # chat storage и domain types
    codex/                     # ChatGPT Codex client
    openrouter/                # OpenRouter client и types
    skills/                    # custom skills
    tools/                     # filesystem tools и permissions
  webview/                     # React webview application
scripts/                       # build/install scripts
media/                         # VS Code contribution assets
assets/                        # application assets
```

Webview использует lightweight feature-sliced layout:

- `src/webview/app`
- `src/webview/pages`
- `src/webview/widgets`
- `src/webview/features`
- `src/webview/entities`
- `src/webview/shared`

## Установка зависимостей

```bash
npm install
```

## Сборка

```bash
npm run build
```

Build flow:

1. `npm run typecheck` проверяет TypeScript.
2. `npm run build:extension` собирает `src/extension.ts` в `dist/extension.js`.
3. `npm run build:webview` собирает React webview и Tailwind CSS в `dist/`.

## Проверки

```bash
npm run typecheck
npm run test
npm run test:e2e
npm run format:check
```

E2E tests сначала собирают extension и webview, затем запускают Playwright.

## Storybook

```bash
npm run storybook
npm run build:storybook
```

Storybook использует fixtures из `src/webview/storybook/fixtures.ts`.

## Упаковка VSIX

```bash
npm run package
```

Команда выполняет полный build и создает `.vsix` package через `vsce package --no-dependencies`.

## Локальная установка

```bash
npm run install:extension
```

Для VS Code Insiders:

```bash
VSCODE_CLI=code-insiders npm run install:extension
```

## Релиз новой версии

1. Обновите `version` в `package.json` и `package-lock.json`.
2. Соберите versioned VSIX в `releases/`:

   ```bash
   npm install
   npm run package -- --out releases/aist-<version>.vsix
   ```

3. Обновите stable artifact:

   ```bash
   cp releases/aist-<version>.vsix releases/aist-latest.vsix
   ```

4. Проверьте артефакты:

   ```bash
   ls -lh releases/aist-<version>.vsix releases/aist-latest.vsix
   git status --short releases/aist-<version>.vsix releases/aist-latest.vsix
   ```

5. Закоммитьте и отправьте:

   ```bash
   git add package.json package-lock.json README.md docs releases/aist-<version>.vsix releases/aist-latest.vsix
   git commit -m "Release aist <version>"
   git push origin main
   ```

6. Проверьте установку из GitHub на чистой машине:

   ```bash
   bash <(curl -fsSL https://raw.githubusercontent.com/stray-live-pixel/aist/main/scripts/install-from-github.sh)
   ```
