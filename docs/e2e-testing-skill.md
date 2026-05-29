# E2E testing skill для AIST

Используй этот skill перед задачами, где нужно создавать, править, анализировать или сопровождать Playwright e2e тесты AIST.

## Главный принцип

E2E тесты AIST проверяют пользовательские flow в реальном VS Code. Они не должны подменять приложение внутренними API, если пользовательский путь доступен через UI. Тест должен доказывать продуктовый контракт: пользователь открыл нужный экран, выполнил действие, увидел результат, а backend/daemon получил ожидаемые данные.

## Что уже настроено

- Playwright config: `playwright.config.ts`.
- Test dir: `tests/e2e`.
- VS Code запускается реальный, через worker fixture `workbench`.
- OpenRouter-compatible mock server доступен через fixture `openRouterMock`.
- Внешние AI-запросы запрещены: daemon получает endpoint из e2e override и ходит в локальный mock.
- Webview открывается helper-ами из `tests/e2e/fixtures.ts`.
- AIST webview перед screenshot расширяется примерно до 800px helper-ом `expectAistScreenshot`.
- Тема VS Code для e2e фиксируется инфраструктурой на стандартную тёмную тему.
- Тестовый VS Code закрывается worker fixture cleanup-ом.

## Где писать тесты

- Feature specs лежат в `tests/e2e/features/<feature>`.
- Chat specs: `tests/e2e/features/chat`.
- Settings specs: `tests/e2e/features/settings`.
- Общие e2e orchestration helpers: `tests/e2e/sources`.
- Низкоуровневые утилиты: `tests/e2e/utils`.
- Один helper/утилита — один файл.
- Не превращай `fixtures.ts` в монолит: он должен только собирать fixtures и экспортировать публичные helpers.

## Доступные helpers

Импортируй из `tests/e2e/fixtures.ts`:

```ts
import { expect, expectAistScreenshot, openAistChat, openAistSettings, test } from '../../fixtures';
```

Полезные helpers:

- `openAistChat({ page })` — открывает AIST chat через реальный VS Code UI или переиспользует уже открытый webview.
- `openAistSettings({ page })` — открывает настройки через кнопку `Открыть настройки агента` в composer.
- `expectAistScreenshot({ webview, name })` — делает snapshot всего body webview при ширине около 800px.
- `runCommand({ page, commandTitle })` — запускает VS Code command palette command.
- `openRouterMock.reset()` — очищает историю mock AI requests перед сценарием.
- `openRouterMock.requests` — реальные HTTP-запросы daemon к mock AI endpoint.

## Как писать user flow tests

- Названия `test(...)` пиши на русском языке.
- Каждый самостоятельный scenario — отдельный `test`, кроме cases, где полезнее один flow по матрице однотипных страниц.
- В описании теста фиксируй:
  - задачу пользователя;
  - зачем это важно;
  - как тест проверяет решение.
- Используй реальные UI действия: click, fill, press, checkbox/select.
- Предпочитай role/title/label/placeholder локаторы.
- Для composer используй активный textarea, потому что во время анимации в DOM может быть read-only копия:

```ts
const composerPlaceholder = 'Попросите агента проверить, создать, изменить или удалить файлы проекта...';
const prompt = webview.locator(`textarea[placeholder="${composerPlaceholder}"]:not([readonly])`);
```

- Для отправки prompt стабильнее использовать shortcut, если кнопка может быть перекрыта overlay/animation:

```ts
await prompt.press(process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter');
```

- Если одинаковый текст встречается несколько раз в истории, уточняй locator через `.last()`, `.first()`, `getByRole('article')` или конкретный container.
- После модалок закрывай overlay явно, иначе следующий test в том же worker может получить pointer interception.
- Если повторно нужен уже открытый chat, `openAistChat` сам переиспользует существующий webview.

## Как работать с AI mock

- Перед тестом, который проверяет запрос модели, делай:

```ts
openRouterMock.reset();
```

- После отправки prompt проверяй количество запросов:

```ts
await expect.poll(() => openRouterMock.requests.length).toBe(1);
```

- Проверяй endpoint:

```ts
expect(openRouterMock.requests[0]?.url).toBe('/api/v1/chat/completions');
```

- Чтобы доказать, что инструкция реально ушла модели, проверяй `messages` в mock request, а не только UI:

```ts
const systemPrompt = getSystemPromptFromMockRequest({ request: openRouterMock.requests[0] });
expect(systemPrompt).toContain('MY_INSTRUCTION_MARKER');
```

- Для новых deterministic model responses добавляй отдельный builder в `tests/e2e/sources`, например `buildMarkdownAnswerResponse.ts`, и подключай его в `buildMockModelResponse.ts`.

## Screenshot testing

Комбинируй e2e и screenshots в ключевых состояниях, но не снимай каждый шаг.

Хорошие snapshot-точки:

- пустой chat/composer ready;
- ответ модели после завершения;
- раскрытый tool-call;
- открытая модалка списка чатов;
- отфильтрованная история prompt;
- раскрытая VCS panel;
- каждая страница настроек;
- сохранённая и активированная инструкция;
- важное состояние формы после пользовательского действия.

Правила screenshot:

- Используй только `expectAistScreenshot({ webview, name })`.
- Имя screenshot должно описывать состояние: `settings-instruction-active.png`, `chat-vcs-controls-open.png`.
- Перед screenshot дождись устойчивого UI assertion: heading/text/button visible.
- Не маскируй весь UI. Helper уже маскирует timestamps.
- Не обновляй snapshots автоматически как «исправление» падения, см. раздел ниже.

## Очень важная политика падений e2e/snapshot

Если e2e или screenshot тест упал после изменения кода или дизайна, не исправляй его автоматически.

Сначала сообщи пользователю:

1. Какой тест упал.
2. На каком assertion/snapshot он упал.
3. Что изменилось в UI/поведении/данных.
4. Какие изменения кода или дизайна вероятно привели к падению.
5. Это похоже на ожидаемое изменение продукта или на регрессию.
6. Рекомендации:
   - обновить snapshot, если изменение согласовано;
   - поправить тест, если изменился пользовательский контракт;
   - чинить продукт, если поведение сломано.

Оператор агента принимает решение, что делать с упавшим тестом и насколько это критично. Агент не должен сам молча обновлять snapshots или переписывать тесты под новый UI после падения.

Исключение: когда ты только создаёшь новый тест или новый snapshot в рамках текущей задачи, можно запускать `--update-snapshots`, потому что эталон ещё не существовал.

## Команды

Установка cached VS Code для e2e:

```bash
npm run install:e2e:vscode
```

Сборка перед e2e:

```bash
npm run build:e2e
```

Полный e2e:

```bash
npm run test:e2e
```

Pre-commit e2e subset:

```bash
npm run test:e2e:precommit
```

Точечный e2e:

```bash
npm run build:e2e && npx playwright test tests/e2e/features/settings/instructions-flow.spec.ts --reporter=list
```

Создание новых snapshots только для новых тестов:

```bash
npm run build:e2e && npx playwright test <spec> --reporter=list --update-snapshots
```

Проверка размеров screenshot при необходимости:

```bash
node - <<'NODE'
const sharp = require('sharp');
const file = 'tests/e2e/features/settings/settings-pages.spec.ts-snapshots/settings-overview-vscode-darwin.png';
sharp(file).metadata().then((metadata) => console.log(metadata.width, metadata.height));
NODE
```

## Pre-commit

Pre-commit запускает быстрый e2e subset через `npm run test:e2e:precommit`. Если он упал из-за ожидаемого визуального изменения, не обновляй snapshots автоматически — сначала объясни оператору причину падения и попроси решение.

## Checklist перед финальным ответом

- Изменения e2e сгруппированы по feature.
- Нет реальных внешних AI-запросов.
- Mock responses deterministic.
- Есть screenshot только в полезных состояниях.
- Typecheck запущен и результат честно указан.
- Релевантный e2e запущен и результат честно указан.
- Если e2e/snapshot упал — пользователь получил объяснение и рекомендации, а не автоматическое «исправление» эталона.
