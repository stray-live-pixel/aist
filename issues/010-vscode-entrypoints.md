# 010 — VS Code entrypoints и автономная страница

## Цель

Добавить пользовательский вход в native autonomous runner: command palette, кнопка в activity bar title и отдельная webview page/panel.

## Изменения package.json

Добавить command:

```json
{
  "command": "openrouterAgent.openAutonomous",
  "title": "aist: Open Autonomous Runner",
  "icon": "$(rocket)"
}
```

Activation event:

```json
"onCommand:openrouterAgent.openAutonomous"
```

Menu:

```json
{
  "command": "openrouterAgent.openAutonomous",
  "when": "view == openrouterAgent.chats",
  "group": "navigation@4"
}
```

## Extension activation

`src/extension.ts`:

- создать `AutonomousController`;
- зарегистрировать command;
- добавить controller в subscriptions;
- не менять существующую регистрацию `openrouterAgent.chats`.

## Panel MVP

`AutonomousController.openPanel()`:

- reveal existing panel;
- create panel if absent;
- use existing `getWebviewHtml`;
- post `page: autonomous`;
- post autonomous state;
- handle autonomous messages;
- dispose panel reference only.

## Future view

После MVP можно добавить second contributed webview:

```json
{
  "type": "webview",
  "id": "openrouterAgent.autonomous",
  "name": "Autonomous"
}
```

Но только после расширения surface model без `chatId` assumptions.

## React chat button

Не обязательно в MVP. Если добавлять:

- использовать shared `CompactNavigationButton`;
- icon `Rocket` from `lucide-react`;
- action вызывает `openrouterAgent.openAutonomous` через webview message или VS Code command bridge;
- не перегружать ChatPage ответственностью autonomous UI.

## Критерии готовности

- Command Palette открывает autonomous panel.
- Title button открывает autonomous panel.
- Повторный вызов reveal-ит panel.
- Закрытие panel не останавливает running sessions автоматически.
- Chat commands продолжают работать.
