# AIST performance telemetry

## Что это

Performance telemetry — локальная системная аналитика скорости расширения AIST. Она отделена от run/tool telemetry: здесь измеряются не prompt и tools, а пользовательские задержки extension, daemon bridge и webview.

## Где смотреть

- UI: **Settings → Telemetry → Extension performance**.
- Файлы: `~/.aist-agent/performance-telemetry/*.json`.
- Export: кнопки **Copy performance JSON** и **Copy performance Markdown** на странице телеметрии.

## Какие операции измеряются

- `chat.create` — создание нового чата.
- `agent.request` — полный lifecycle запроса к агенту от `chat.ask` до финального daemon event.
- `webview.state` — доставка полного `state` в webview surface.
- `webview.patch` — доставка `chat.patch` в нужную webview surface.
- `webview.render` — batched React-ререндеры компонентов webview.

## Как оценивать регрессию

1. Открой **Settings → Telemetry → Extension performance**.
2. Сначала посмотри **Slowest groups**: там видны главные bottleneck-и по avg/p95/max.
3. Проверь **By operation**, чтобы понять уровень проблемы: daemon request, transport state/patch или React render.
4. Проверь **By chat**, если лаг воспроизводится только в отдельных больших чатах.
5. Проверь **By day/week/month** и **By extension version**, чтобы сравнить изменение с предыдущими релизами или рабочими днями.
6. Скопируй Markdown export и приложи к issue/review вместе со сценарием воспроизведения.

## Безопасность данных

Performance telemetry не должна сохранять raw prompt, tool args, tool outputs, secrets или содержимое файлов. Записи содержат только operation, duration, chat/surface ids, extension version, render counters и безопасные meta-поля.

## Подсказка для ИИ-агента

Если пользователь просит найти лаги, CPU spikes или проверить performance regression, сначала посмотри:

- `~/.aist-agent/performance-telemetry`;
- страницу **Settings → Telemetry**;
- Markdown/JSON export performance telemetry.

Для UI-регрессий сравни `webview.render`, `webview.patch`, `webview.state`. Для долгих ответов агента сравни `agent.request`. Для проблем кнопки нового чата сравни `chat.create`.
