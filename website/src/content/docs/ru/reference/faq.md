---
title: FAQ
description: Частые вопросы об AIST.
---

## AIST сам меняет файлы?

По умолчанию изменения файлов требуют подтверждения и проходят через VS Code diff-preview.

## Нужно ли вставлять содержимое файлов в чат?

Обычно нет. Откройте нужный файл или выделите код перед запросом.

## Где хранятся API keys?

OpenRouter keys хранятся в CLI/global secret store или передаются через `OPENROUTER_API_KEY`. Secrets не должны попадать в workspace settings.
