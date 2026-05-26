# 009 — IPC, presenter и webview state без регрессий chat UI

## Цель

Добавить IPC/state для native autonomous runner, не ломая существующий chat/settings IPC.

## Принцип

Autonomous messages должны быть отделены от chat messages. Не расширять `AgentController` бизнес-логикой autonomous runner.

## Extension modules

```text
src/extension/autonomous/controller.ts
src/extension/autonomous/messages.ts
src/extension/autonomous/presenter.ts
src/extension/autonomous/webviewHost.ts
```

## Webview modules

```text
src/webview/shared/lib/autonomousActions.ts
src/webview/shared/lib/autonomousState.tsx
src/webview/shared/autonomousTypes.ts
```

## Messages

Webview → extension:

```ts
| { type: 'autonomous.refresh' }
| { type: 'autonomous.importLegacyPrompt' }
| { type: 'autonomous.startFlow'; flowId: string; options: AutonomousLaunchOptions }
| { type: 'autonomous.startRun'; runId: string; options: AutonomousLaunchOptions }
| { type: 'autonomous.stopSession'; sessionId: string }
| { type: 'autonomous.openSessionFile'; sessionId: string; file: 'meta' | 'events' | 'flow' | 'batch' | 'summary' }
| { type: 'autonomous.revealSession'; sessionId: string }
| { type: 'autonomous.exportSession'; sessionId: string; format: 'markdown' | 'json' }
```

Extension → webview:

```ts
| { type: 'page'; page: 'chat' | 'settings' | 'autonomous' }
| { type: 'autonomousState'; state: AutonomousState }
| { type: 'errorModal'; message: string }
```

## AutonomousState

```ts
export type AutonomousState = {
  loading: boolean;
  workspaceName: string;
  definitions: {
    flows: AutonomousFlowSummary[];
    runs: AutonomousRunSummary[];
  };
  sessions: AutonomousSessionView[];
  engines: AutonomousEngineOption[];
  diagnostics: AutonomousDiagnostic[];
  lastRefreshedAt?: number;
};
```

## Routing

- `App.tsx` supports page `autonomous`.
- `AutonomousStateProvider` wraps only `AutonomousPage`.
- `AgentStateProvider` remains for chat/settings.
- If autonomous page opens before `AgentState`, it still can render using autonomous state + minimal app language fallback.

## Error handling

- Autonomous errors go to autonomous diagnostics and optional global error modal.
- They must not append to active chat.
- Chat `reportError` remains unchanged.

## Type safety

- No `any` in message contracts.
- Extension/webview contracts updated together.
- Use discriminated unions and type guards.

## Tests/checks

- Typecheck catches all new messages.
- Chat message dispatcher ignores autonomous messages unless panel host routes them separately.
- Autonomous host does not call `surface.getChatId()`.

## Критерии готовности

- Autonomous panel receives state and can send commands.
- Chat sidebar still sends/receives old `state` and `page` correctly.
- `stop` command conflict avoided with `autonomous.stopSession`.
