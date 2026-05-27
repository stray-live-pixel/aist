# Optimization issues

Задачи отсортированы так, чтобы первыми шли доработки с максимальным profit при минимальной сложности. Каждая issue — самостоятельная завершённая доработка, после которой можно собрать релиз.

## Recommended order

| #   | Issue                                                                                     |           Profit |  Complexity | Why now                                                                  |
| --- | ----------------------------------------------------------------------------------------- | ---------------: | ----------: | ------------------------------------------------------------------------ |
| 001 | [Compact sectioned system prompt](001-compact-sectioned-system-prompt.md)                 |        Very high |         Low | Влияет на каждый запрос и быстро снижает prompt overhead.                |
| 002 | [`read_file_range` tool](002-read-file-range-tool.md)                                     |             High |  Low/Medium | Сразу уменьшает чтение больших файлов после поиска.                      |
| 003 | [Compaction with `keepLastMessages`](003-compaction-keep-last-messages.md)                |             High |         Low | Реализует уже существующую настройку и снижает потерю свежего контекста. |
| 004 | [Approval feedback as first-class signal](004-approval-feedback-signal.md)                |             High |      Medium | Улучшает управление агентом без долгосрочной памяти.                     |
| 005 | [Editor context mode](005-editor-context-mode.md)                                         |             High |      Medium | Уменьшает случайное загрязнение prompt активным файлом.                  |
| 006 | [`grep_search` output controls](006-grep-search-output-controls.md)                       |      Medium/High |      Medium | Делает широкий поиск дешевле по токенам.                                 |
| 007 | [`outline_file` tool](007-outline-file-tool.md)                                           |      Medium/High |      Medium | Позволяет понимать структуру файла без полного чтения.                   |
| 008 | [Structured tool errors](008-structured-tool-errors.md)                                   |           Medium |  Low/Medium | Улучшает recovery после неудачных tools.                                 |
| 009 | [`apply_patch` tool with preview](009-apply-patch-tool.md)                                |             High |        High | Снижает хрупкость больших exact replacements.                            |
| 010 | [Prompt contract snapshots](010-prompt-contract-snapshots.md)                             |           Medium |         Low | Защищает последующие prompt/tool изменения от регрессий.                 |
| 011 | [Tool result dual-channel](011-tool-result-dual-channel.md)                               |             High |        High | Сильно уменьшает history bloat, но требует аккуратной архитектуры.       |
| 012 | [Repo map cache and verification hints](012-repo-map-and-verification-hints.md)           |      Medium/High |        High | Ускоряет выбор команд и снижает exploratory tool calls.                  |
| 013 | [ContextGovernor MVP](013-context-governor-mvp.md)                                        |             High |        High | Даёт системное управление контекстом, но требует нескольких интеграций.  |
| 014 | [Local self-improving memory](014-local-self-improving-memory.md)                         |        Very high |        High | Стратегически ценно, но затрагивает storage, UI и prompt.                |
| 015 | [Declarative project instructions loader](015-declarative-project-instructions-loader.md) |             High | Medium/High | Первый безопасный шаг к `.aist-agent` declarative runtime.               |
| 016 | [Post-run reflection candidates](016-post-run-reflection-candidates.md)                   |             High |        High | Делает память самоулучшаемой, но требует trace builder и UI inbox.       |
| 017 | [Declarative shell tools](017-declarative-shell-tools.md)                                 |             High |   Very high | Расширяет runtime surface, требует строгой security модели.              |
| 018 | [Semantic `edit_file` tool](018-semantic-edit-file-tool.md)                               |             High |   Very high | Потенциально мощно, но сложно безопасно реализовать.                     |
| 019 | [Tool-use telemetry dashboard](019-tool-use-telemetry-dashboard.md)                       |           Medium |        High | Полезно для измерений, но не улучшает качество напрямую.                 |
| 020 | [Opt-in cloud memory sync](020-cloud-memory-sync.md)                                      | Medium/Strategic |   Very high | Максимальная сложность и privacy risk, поэтому последняя.                |

## Release rule

Каждая issue должна завершаться состоянием, в котором:

- TypeScript компилируется.
- Unit tests для затронутого слоя добавлены или обновлены.
- UI/IPC contracts синхронизированы, если менялись сообщения webview.
- Новые prompt/tool правила покрыты snapshot или focused tests, если применимо.
- Можно собрать и выпустить VSIX без ожидания следующих issues.

## Notes

- Порядок не запрещает параллельную работу, но зависимости стоит учитывать: `014` лучше делать после `004`, а `017` после `015`.
- Cloud sync (`020`) намеренно последняя из-за privacy, backend и trust model.
- Declarative runtime сначала вводится read-only через instructions (`015`), а только потом executable tools (`017`).
