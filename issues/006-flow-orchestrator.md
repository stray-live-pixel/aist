# 006 — Node orchestration engine для multi-stage flow

## Цель

Заменить `prompt/src/run_flow.py` TypeScript/Node orchestrator-ом внутри extension.

## Где реализовать

```text
src/extension/autonomous/flow/orchestrator.ts
src/extension/autonomous/flow/contextResolver.ts
src/extension/autonomous/flow/promptBuilder.ts
src/extension/autonomous/flow/modelResolver.ts
src/extension/autonomous/flow/orchestrator.test.ts
```

## Required behavior parity

Из старого `run_flow.py` перенести:

- последовательный запуск stages;
- `status: pending|running|done|error`;
- `current` stage index;
- `startedAt/finishedAt`;
- `model`/`codex_model` resolution;
- `default_summary_rules` cascade;
- `contexts` validation;
- максимум один resume context на stage;
- любое число `summary-from`;
- extra prompt prepend;
- dry-run synthetic execution;
- error stops flow;
- stage result/sessionRef persistence.

## Context resolver

Поддержать modes:

### standalone

Нет contexts. Prompt = extra prompt + stage body.

### continue

- Если engine supportsResume: resume previous sessionRef.
- Если нет: fallback to previous stage result/summary in prompt или error according policy.

### continue-from

- Если engine supportsFork: fork source sessionRef and resume fork.
- Если engine supportsResume but no fork: можно resume source только если это безопасно? По умолчанию нельзя, чтобы не загрязнять контекст.
- Если API engine: fallback prompt context.

### summary-from

- Запустить summary call через тот же engine или dedicated summary mode;
- Использовать rules cascade: context → stage → flow;
- Вставить summary в prompt в порядке contexts.

## Prompt builder

Итоговый prompt:

```text
## Контекст из этапа K (summary)
<summary>

---

<EXTRA_PROMPT>

---

<stage body>
```

Также логировать `STAGE_CTX` event с тем, какие contexts применены и был ли fallback.

## Flow state

Заменить `flow.json` old shape на typed state, но сохранить достаточно близкий format для UI:

```ts
export type AutonomousFlowState = {
  flow: string;
  title: string;
  description?: string;
  engineId: AutonomousEngineId;
  stages: AutonomousStageRuntimeState[];
  current: number;
  status: 'running' | 'done' | 'error' | 'stopped';
  startedAt: string;
  finishedAt?: string;
  error?: string;
};
```

## Dry run

Dry-run должен работать без installed `claude`/`codex` и без API credentials:

- synthetic sessionRef;
- synthetic assistant/result events;
- deterministic stage results;
- stage durations short but visible.

## Cancellation

- Orchestrator получает AbortSignal.
- При stop текущий engine run abort-ится.
- Flow state становится `stopped`.
- Уже завершённые stages остаются `done`.

## Нельзя делать

- Не вызывать `python3 run_flow.py`.
- Не копировать весь старый `flow.json` parser в UI как source of truth.
- Не смешивать flow state с chat history.

## Тесты

- standalone flow executes stages in order.
- context validation rejects invalid from.
- summary-from adds summary before body.
- continue-from calls engine fork when supported.
- API fallback logs diagnostic.
- stage failure stops flow.
- abort stops current stage.

## Критерии готовности

- `example` flow dry-run исполняется полностью в TS.
- `create-edit-section` contexts валидируются.
- No Python/shell orchestrator dependency.
- Session events достаточны для UI pipeline/logs.
