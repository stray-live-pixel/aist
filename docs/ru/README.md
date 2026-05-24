# Документация aist

[English documentation](../README.md)

AIST — расширение VS Code с чат-агентом для разработки. Агент может работать через модели OpenRouter или ChatGPT Codex, изучать текущий workspace, запрашивать подтверждения перед рискованными действиями и редактировать файлы через нативный diff-preview VS Code.

## Разделы

- [Установка](installation.md)
- [Руководство пользователя](user-guide.md)
- [Конфигурация](configuration.md)
- [Инструменты, подтверждения и безопасность](tools-and-safety.md)
- [Инструкции, режимы и навыки агента](agent-customization.md)
- [Разработка и релиз](development.md)

## Быстрый старт

1. Установите расширение из GitHub:

   ```bash
   bash <(curl -fsSL https://raw.githubusercontent.com/stray-live-pixel/aist/main/scripts/install-from-github.sh)
   ```

2. Настройте OpenRouter API key в настройках VS Code или через `OPENROUTER_API_KEY`:

   ```json
   {
     "openrouterAgent.apiKey": "sk-or-...",
     "openrouterAgent.model": "openai/gpt-4o-mini",
     "openrouterAgent.language": "en"
   }
   ```

3. Откройте `aist` в Activity Bar, создайте или выберите чат и отправьте вопрос.

Для моделей ChatGPT Codex выполните `aist: Login ChatGPT Codex`, затем выберите модель с префиксом `codex:`.

## Основные понятия

- **Чаты** хранятся расширением; их можно создавать, дублировать, удалять, сжимать и открывать в editor panel.
- **Модели** приходят из OpenRouter или ChatGPT Codex. OpenRouter ID используются как есть, Codex ID имеют префикс `codex:`.
- **Контекст редактора** добавляется автоматически: выбранный код или содержимое активного файла до лимита `openrouterAgent.maxContextChars`.
- **Инструменты** позволяют агенту читать workspace, искать файлы, запускать Bash-команды и менять файлы.
- **Подтверждения** защищают рискованные операции: чтение и поиск по умолчанию автоматические, shell-команды и мутации требуют подтверждения.
- **Инструкции и режимы** настраивают system prompt под проект или пользователя.
- **Навыки** — пользовательские shell-команды, доступные агенту через `run_skill`.
