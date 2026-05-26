# Agent Auto Runner

Скрипт `agent-auto.sh` запускает Claude Code или OpenAI Codex CLI в автономном
режиме и может показывать статус работы.

- `./agent-auto.sh "текстовый prompt"` — обычный запуск.
- `./agent-auto.sh --engine codex "текстовый prompt"` — запуск через Codex CLI.
- `./agent-auto.sh --ui "..."` — мониторинг в терминале.
- `./agent-auto.sh --html "..."` — мониторинг в браузере.
- `./agent-auto.sh --flow <name> [--html] [extra prompt]` — запуск multi-stage flow из `flows/<name>/` (см. [flows/README.md](flows/README.md)).
- `./agent-auto.sh --cwd <dir> ...` — выполнить задачу в другом каталоге (например, в репозитории, к которому относится задача).
- `./agent-auto.sh --run <name> [--html]` — batch-режим: пакет задач из `runs/<name>/.index.md` (см. [runs/README.md](runs/README.md)).

По умолчанию логи пишутся в `.agent-auto-logs`.
Во время работы в них пишутся служебные события запуска/heartbeat/завершения сессии.
Формат строки в логе:
`[DD-MM-YYYY HH:mm:ss] [ACTION] short text (макс 100 символов)`
`CTX xxk/200k - YY%`

Запуск всегда автономный: Claude вызывается с `--permission-mode bypassPermissions`,
а Codex — с `--dangerously-bypass-approvals-and-sandbox`. Никаких подтверждений
у пользователя не спрашивается. Используй только в доверенных каталогах.

Доп. флаги:

- `--engine claude|codex` — выбрать backend. По умолчанию `claude`.
- `--flow <name>` — путь к flow-папке внутри `flows/`.
- `--run <name>` — batch-режим из `runs/<name>/.index.md` (см. [runs/README.md](runs/README.md)).
- `--cwd <dir>` — рабочий каталог агента. По умолчанию это корень `prompt/`; с `--cwd` агент работает в указанной папке (полезно, если сам репозиторий с задачами лежит отдельно).
- `--dry-run` — для `--flow`/`--run`: эмулирует прогон без вызова агента.
- `--log-dir DIR` — выбрать папку логов.
- `--log-file FILE` — конкретный лог-файл.
- `--port N` — порт для HTML (по умолчанию `8765`).
- `-h` / `--help` — справка.

## Примеры вызова

Простой запуск с промптом, без UI:

```sh
./agent-auto.sh "Refactor this project and run tests"
```

С веб-монитором:

```sh
./agent-auto.sh --html "Summarize and fix issues"
```

С терминальным монитором:

```sh
./agent-auto.sh --ui "Improve docs and run tests"
```

Тот же сценарий через Codex CLI:

```sh
./agent-auto.sh --engine codex --html "Improve docs and run tests"
```

Запуск flow `example` (Snake) с веб-pipeline:

```sh
./agent-auto.sh --flow example --html
```

Flow с дополнительным контекстом — текст приклеится преамбулой к каждому этапу:

```sh
./agent-auto.sh --flow example --html "Поле 25×25, скорость 12 fps"
```

Сухой прогон flow без вызова агента — для проверки структуры и UI:

```sh
./agent-auto.sh --flow example --html --dry-run
```

Flow без UI (только в лог):

```sh
./agent-auto.sh --flow example
tail -f .agent-auto-logs/*/log.txt
```

После завершения flow:

- результат работы — в файлах, которые создал агент (например, `./game.html`);
- `.agent-auto-logs/<id>/flow.json` — финальное состояние pipeline;
- `.agent-auto-logs/<id>/flows/stage-NN.session.jsonl` — снимки сессий этапов.

## Модели

Для Claude одиночный запуск использует `AGENT_AUTO_CLAUDE_MODEL`
(по умолчанию `claude-opus-4-7`). Для Codex можно задать
`AGENT_AUTO_CODEX_MODEL`; если переменная пустая, Codex CLI берёт модель из
своего `~/.codex/config.toml`. Старые алиасы `CLAUDE_AUTO_MODEL` и
`CLAUDE_AUTO_CODEX_MODEL` пока поддерживаются.

Во flow-файлах `model:` остаётся Claude-дефолтом. Для Codex можно указать
`codex_model:` в `.index.md` или конкретном stage-файле. Если `codex_model:`
не задан, а `model:` не похож на `claude-*`, это значение будет использовано и
для Codex.

Для `--html` URL открывается автоматически:
`http://127.0.0.1:8765/ui?session=<ID>`.

HTML собирается на стороне python-сервера из шаблонов в `src/shared/ui/`:
`layout.html` + `parts/{header,ctx,log}.html` + `styles.css` + `app.js`.

Код разложен по нейтральной структуре:

- `src/agents/claude_code/` — адаптер Claude Code;
- `src/agents/codex/` — адаптер OpenAI Codex CLI;
- `src/shared/` — общие shell/python/ui-утилиты.
