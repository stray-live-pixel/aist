# CLI JSONL Fixtures

`015-chat-ask-jsonl.jsonl` documents the MVP stdout contract for:

```text
aist chat ask <chatId> --prompt <text> --workspace <path> --jsonl
```

Each line is one compact `RuntimeEvent` JSON object. Consumers should switch on
`type`, correlate by `run.id` on `run.started`/`run.finished`, and reduce the
stream in order. `message.appended` events are scoped by `chatId`; when read from
`.aist-agent/runs/<runId>/events.jsonl`, their run correlation is the containing
run record.
