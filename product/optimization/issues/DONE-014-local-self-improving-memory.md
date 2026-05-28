# 014 — Local self-improving memory

## Priority

P2 — очень высокий strategic profit, высокая сложность.

## Цель

Добавить локальную global/project память, чтобы AIST учитывал стабильные предпочтения пользователя и уроки проекта.

## Scope

- Ввести типы `AgentMemoryItem`, `AgentMemoryCandidate`, `AgentMemoryScope`.
- Добавить global store `~/.aist-agent/memory.json` и project store `.aist-agent/memory.json`.
- Добавить append-only audit trail `.aist-agent/memory-events.jsonl` для проекта.
- Расширить approval comment model: current comment, `rememberGlobal`, `rememberProject`.
- Auto-save только явно заполненные remember fields.
- Добавить `MemoryRetriever`, который включает top-N релевантных заметок в prompt.
- Добавить settings UI для просмотра/удаления/disable заметок.
- Добавить tests на storage, retrieval, prompt injection filtering.

## Out of scope

- Post-run reflection candidates.
- Cloud sync.
- Declarative tools promotion.

## Acceptance criteria

- Пользователь может явно сохранить global/project preference из approval UI.
- Следующий prompt учитывает релевантные memory notes.
- Memory не сохраняет raw tool outputs/secrets.
- Сборка релиза возможна после задачи.

## Suggested verification

- `npm run compile`
- unit tests для memory store/retriever
- ручная проверка сохранения preference
