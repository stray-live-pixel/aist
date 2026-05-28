# Установка

[English documentation](../installation.md)

## Требования

- VS Code `1.90.0` или новее.
- CLI-команда `code` в `PATH` для установки через скрипт.
- OpenRouter API key для моделей OpenRouter или авторизация ChatGPT Codex для моделей `codex:`.

## Установка из GitHub

Выполните:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/stray-live-pixel/aist/main/scripts/install-from-github.sh)
```

Скрипт скачивает `releases/aist-latest.vsix` из GitHub, устанавливает расширение через VS Code CLI и автоматически перезапускает VS Code.

Для VS Code Insiders:

```bash
VSCODE_CLI=code-insiders bash <(curl -fsSL https://raw.githubusercontent.com/stray-live-pixel/aist/main/scripts/install-from-github.sh)
```

Установка конкретной версии:

```bash
AIST_VERSION=0.0.2 bash <(curl -fsSL https://raw.githubusercontent.com/stray-live-pixel/aist/main/scripts/install-from-github.sh)
```

Если `curl` недоступен, клонируйте репозиторий и выполните:

```bash
bash scripts/install-from-github.sh
```

## Настройка OpenRouter

Сохраните API key в CLI/global secret store:

```bash
aist auth openrouter set-key
```

Затем при необходимости задайте модель по умолчанию:

```json
{
  "openrouterAgent.model": "openai/gpt-4o-mini",
  "openrouterAgent.language": "en"
}
```

Также можно задать переменную окружения `OPENROUTER_API_KEY`.

## ChatGPT Codex

1. Выполните `aist: Login ChatGPT Codex`.
2. Завершите авторизацию.
3. Выберите модель с префиксом `codex:`, например `codex:gpt-5.1-codex`.

Отключение: `aist: Logout ChatGPT Codex` или раздел System в настройках AIST.

## Локальная установка из исходников

```bash
npm install
npm run install:extension
```

Для VS Code Insiders:

```bash
VSCODE_CLI=code-insiders npm run install:extension
```

## Запуск Extension Development Host

1. Откройте репозиторий в VS Code.
2. Установите зависимости:

   ```bash
   npm install
   ```

3. Нажмите `F5`.
4. В Extension Development Host выполните `aist: Open Chat` или откройте `aist` в Activity Bar.
