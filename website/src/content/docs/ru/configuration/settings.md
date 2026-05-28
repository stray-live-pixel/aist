---
title: Настройки
description: Основные настройки AIST.
---

Настройки используют namespace `openrouterAgent.*`.

| Настройка                           | По умолчанию         | Описание                                       |
| ----------------------------------- | -------------------- | ---------------------------------------------- |
| `openrouterAgent.model`             | `openai/gpt-4o-mini` | ID активной модели.                            |
| `openrouterAgent.language`          | `en`                 | Язык ответов агента и причин tool calls.       |
| `openrouterAgent.editorContextMode` | `auto`               | Управляет автоматическим контекстом редактора. |
| `openrouterAgent.maxContextChars`   | `12000`              | Максимум символов активного файла в контексте. |
| `openrouterAgent.reasoningEffort`   | `auto`               | Reasoning effort для OpenRouter.               |
| `openrouterAgent.agentMode`         | `default`            | Активный режим агента.                         |
| `openrouterAgent.agentConfigScope`  | `workspace`          | Где хранится кастомизация проекта.             |
| `openrouterAgent.toolPermissions`   | см. defaults         | Права инструментов.                            |
