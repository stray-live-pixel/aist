---
title: Установка
description: Установка AIST из GitHub или из исходников.
---

## Требования

- VS Code `1.90.0` или новее.
- Команда `code` в `PATH` для установки через скрипт.
- OpenRouter API key или авторизация ChatGPT Codex.

## Установка из GitHub

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/stray-live-pixel/aist/main/scripts/install-from-github.sh)
```

Для VS Code Insiders:

```bash
VSCODE_CLI=code-insiders bash <(curl -fsSL https://raw.githubusercontent.com/stray-live-pixel/aist/main/scripts/install-from-github.sh)
```

## OpenRouter

Сохраните ключ в CLI/global secret store:

```bash
aist auth openrouter set-key
```

Или задайте переменную окружения:

```bash
export OPENROUTER_API_KEY=sk-or-...
```

## ChatGPT Codex

1. Выполните **aist: Login ChatGPT Codex**.
2. Завершите авторизацию.
3. Выберите модель с префиксом `codex:`.
