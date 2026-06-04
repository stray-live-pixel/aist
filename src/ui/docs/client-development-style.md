# Client Development Style

## Главный принцип

Client-код должен читаться от пользовательского сценария. Если разработчика разбудить ночью, он должен быстро найти страницу, крупный widget, feature-действие, UI-компонент, store/API и адаптер среды запуска, которые этот сценарий обслуживают.

## Общий UI для разных сред запуска

Визуальный интерфейс агента должен быть общим для web, VS Code и будущего desktop.

Среда запуска UI — это контейнер и адаптер. Она подключает общий интерфейс к конкретному transport, storage, router, theme и host API.

Без явного решения нельзя хардкодить в UI зависимости от:

- VS Code extension;
- browser-only API;
- desktop-only API;
- конкретного URL daemon;
- конкретного transport.

Все такие зависимости передаются через props, hooks, store actions или adapter API.

Плохо:

```ts
vscode.postMessage({ type: 'message/send' });
```

Хорошо:

```ts
onSendMessage({ text });
```

Контракты адаптеров описываем в shared-слое, а реализацию держим в конкретной среде запуска.

```text
src/ui/shared/api/
  AgentClient.types.ts

src/ui/web/adapters/
  createWebAgentClient.ts

src/ui/vscode/adapters/
  createVscodeAgentClient.ts
```

Общий UI импортирует только тип или абстрактный client contract, но не конкретный web/vscode/desktop adapter.

## Структура client-кода

Client-код организуем feature-first, ближе к FSD. Общие визуальные части живут в `src/ui/shared`, а `web`, `vscode` и `desktop` подключают их через свои адаптеры:

```text
src/ui/
  shared/
    app/
    pages/
    widgets/
    features/
    entities/
    api/
    store/
    ui/
    utils/

  web/
    app/
    adapters/

  vscode/
    app/
    adapters/

  desktop/
    app/
    adapters/
```

Папки feature/group называем по продуктовой роли в kebab-case: `send-message`, `select-model`, `message-list`, `chat-layout`.

Папки React-компонентов называем с большой буквы: `SendMessageForm`, `MessageCard`, `ChatLayout`.

Не прячем продуктовый код в общие папки `components` или `utils`.

## Структура React-компонента

Каждый React-компонент лежит в своей папке. Компоненты называем с большой буквы:

```text
MyGoodComponent/
  Component.tsx
  Component.module.scss
  Component.types.ts
  Component.storybook.tsx
  utils/
  hooks/
  parts/
```

Файлы:

- `Component.tsx` — сам компонент.
- `Component.module.scss` — стили компонента.
- `Component.types.ts` — типы props и локальные типы компонента.
- `Component.storybook.tsx` — состояния компонента в Storybook.
- `utils/` — вспомогательные функции только этого компонента.
- `hooks/` — хуки и логика только этого компонента.
- `parts/` — внутренние части сложного компонента.

Если компонент сложный, создаём `parts`. Каждая часть внутри `parts` тоже лежит в своей папке и повторяет ту же структуру:

```text
MyGoodComponent/
  Component.tsx
  parts/
    Title/
      Component.tsx
      Component.module.scss
      Component.types.ts
    Actions/
      Component.tsx
      Component.module.scss
      Component.types.ts
```

Не кладём несколько React-компонентов рядом в один плоский файл, если они имеют самостоятельный смысл.

## Размер компонента

Компонент должен оставаться коротким и легко читаемым сверху вниз.

Ориентиры:

- до `120` строк — хорошо;
- `120-200` строк — допустимо, если JSX всё ещё простой;
- больше `200` строк — почти всегда нужно разделять на `parts`, hooks или template/container.

Если в `Component.tsx` сложно быстро увидеть главный render flow, компонент нужно декомпозировать.

## Чистые компоненты и template-слой

Компоненты должны быть чистыми там, где это возможно.

Если компонент зависит от внешней логики, API, store, router, daemon events или сторонней библиотеки, разделяем его на container и template:

```text
PaymentCard/
  Component.tsx
  PaymentCardTemplate/
    Component.tsx
    Component.module.scss
    Component.types.ts
    Component.storybook.tsx
```

- `PaymentCard/PaymentCardTemplate/Component.tsx` — чистая рендерилка. Получает props и идеально рендерится в Storybook без костылей.
- `PaymentCard/Component.tsx` — container. Здесь можно использовать hooks, store, API и внешние зависимости.

Плохо:

```ts
export function PaymentCard() {
  const payment = usePaymentApi();
  const theme = useExternalTheme();
  return <div>{payment.title}</div>;
}
```

Хорошо:

```ts
export function PaymentCard() {
  const props = usePaymentCard();
  return <PaymentCardTemplate {...props} />;
}
```

## App.tsx

`App.tsx` не должен превращаться в главный склад приложения.

В `App.tsx` допустимо:

- подключить providers;
- выбрать текущую страницу;
- показать global loading/error boundary.

В `App.tsx` не должно быть:

- всей бизнес-логики чата;
- API-вызовов daemon;
- JSX всех экранов;
- handler-ов всех кнопок;
- сложных `useEffect` для каждого сценария.

Плохо:

```text
App.tsx
  load state
  subscribe events
  render sidebar
  render messages
  render composer
  resolve approvals
  select model
  create chat
```

Хорошо:

```text
App.tsx
  -> ChatPage
    -> ChatLayout
      -> ChatList
      -> MessageList
      -> SendMessageForm
```

## Store

Используем `Zustand + devtools` как общий UI store.

Store хранит:

- daemon snapshot/projection;
- active chat/page;
- connection status;
- pending UI operations;
- modals/panels;
- временное UI-состояние.

Store не хранит backend truth. Истина остаётся в daemon/core.

Actions называем как пользовательские или daemon-события:

```text
daemon/stateLoaded
daemon/eventReceived
chat/selected
message/sendRequested
approval/resolved
ui/errorShown
```

## API client

API-клиент лежит отдельно от React-компонентов.

```text
shared/api/
  rpc.ts
  events.ts
```

Компоненты не должны напрямую писать `fetch('/api/rpc')` или создавать `new EventSource(...)`. Они вызывают feature hook или store action.

Компонентам передаём callback-и. Максимум, что компонент знает о callback-е: имя, аргументы, возвращает ли он `Promise`, и какие UI-состояния из этого следуют.

Плохо:

```ts
function SendButton() {
  async function send() {
    await fetch('/api/rpc', ...);
  }
}
```

Хорошо:

```ts
function SendMessageForm({ onSendMessage }: SendMessageFormProps) {
  return <form onSubmit={handleSubmit}>...</form>;
}
```

## Components

Компонент должен делать одну понятную вещь.

Разделяем роли:

- `Page` — собирает экран.
- `Widget` — крупная часть экрана.
- `Feature` — пользовательское действие.
- `Entity` — отображение доменной сущности.
- `Shared UI` — кнопки, поля, модалки, layout primitives.

Не смешиваем в одном компоненте:

- загрузку данных;
- mutation API;
- layout целого экрана;
- rendering конкретной entity;
- локальную форму;
- global error handling.

## UI states

UI должен быть отзывчивым и информативным. Не должно быть сценария, где пользователь сделал действие и визуально ничего не произошло.

Для каждого сценария явно продумываем состояния:

- `idle` — можно действовать;
- `loading` — данные загружаются;
- `pending` — действие отправлено и ждёт ответа;
- `streaming` — агент уже отвечает потоком событий;
- `empty` — данных нет;
- `error` — действие или загрузка завершились ошибкой;
- `disabled` — действие временно недоступно;
- `success` — действие успешно завершилось, если это важно показать.

Для async-действий обязательно:

- блокировать повторное опасное действие;
- показывать progress или pending state;
- давать понятный результат успеха или ошибки;
- не терять введённые пользователем данные без явного решения.

## Forms

Если есть форма для заполнения, используем нативный `<form>`.

Submit обрабатываем через `onSubmit`, а не через `onClick` на кнопке.

Плохо:

```tsx
<div>
  <input value={text} onChange={onChange} />
  <Button onClick={onSend}>Send</Button>
</div>
```

Хорошо:

```tsx
<form onSubmit={handleSubmit} data-test-id="send-message-form">
  <TextArea value={text} onChange={onChange} data-test-id="send-message-input" />
  <Button type="submit" data-test-id="send-message-submit-button" />
</form>
```

Draft формы хранится рядом со сценарием: в local state, feature hook или store, если draft должен жить между экранами.

## Shared компоненты в первую очередь

В продуктовых компонентах используем shared UI-компоненты как основной строительный материал.

Можно использовать DOM-элементы и локальные стили для позиционирования:

```tsx
<section className={styles.root} data-test-id="payment-card">
  <Card data-test-id="payment-card-card">...</Card>
</section>
```

Нельзя заново собирать существенные контентные блоки на голых DOM-элементах, если такой блок должен быть общим:

```tsx
<button className={styles.primaryButton}>Pay</button>
```

Если в `shared` нет нужного компонента, сначала создаём shared-компонент и используем его.

Так интерфейс остаётся консистентным между web, VS Code и desktop.

## Shared UI

Shared UI-компоненты подчиняются тем же правилам, что и обычные компоненты:

```text
Button/
  Component.tsx
  Component.module.scss
  Component.types.ts
  Component.storybook.tsx
  __tests__/
```

Shared UI должен описывать базовые состояния:

- `default`;
- `hover/focus`;
- `disabled`;
- `loading`, если компонент запускает действие;
- `error`, если компонент отображает ошибку;
- размеры и варианты, если они нужны продукту.

Shared UI не знает про daemon, VS Code, web routes или конкретные feature.

## CSS и classnames

Если нужно указать больше одного класса, используем библиотеку `classnames`.

Плохо:

```tsx
<div className={`${styles.root} ${active ? styles.active : ''}`} />
```

Хорошо:

```tsx
<div className={classnames(styles.root, active && styles.active)} />
```

Классы описывают визуальное состояние, а не бизнес-логику.

## data-test-id

Для каждого DOM-элемента добавляем `data-test-id`.

Имена должны быть понятными и стабильными:

```tsx
<article data-test-id="message-card">
  <header data-test-id="message-card-header">
    <Button data-test-id="message-card-copy-button" />
  </header>
</article>
```

`data-test-id` нужен не только тестам, но и screenshot/e2e/debug-инструментам.

## Accessibility

Accessibility желательно соблюдать по умолчанию.

Минимальные правила:

- используем семантический HTML;
- кнопки делаем через `<button>`, ссылки через `<a>`;
- кликабельные `div` не используем;
- у form controls есть понятное имя через label или `aria-label`;
- focus state не убираем без замены;
- `aria-*` добавляем только когда семантического HTML недостаточно.

## Hooks

Hooks называем по действию:

```text
useSendMessage
useSelectChat
useResolveApproval
useDaemonEvents
```

Hook может использовать store/API, но не должен знать детали соседней feature.

## Ошибки

Ошибки обрабатываем через единую точку.

Нужны:

- общий error store/action;
- единая модалка или global error surface для информирования пользователя;
- технические детали для debug/logs;
- понятный пользовательский текст для UI.

Компоненты не должны каждый по-своему показывать критические ошибки.

Плохо:

```ts
alert(error.message);
```

Хорошо:

```ts
showError({ messageKey: 'errors.daemonUnavailable', cause: error });
```

## i18n и тексты

Интерфейс минимум поддерживает русский и английский языки.

Не пишем пользовательские строки прямо внутри больших компонентов. Тексты храним рядом с feature или в shared i18n, если они общие.

Плохо:

```tsx
<Button>Send</Button>
```

Хорошо:

```tsx
<Button>{t('sendMessage.submit')}</Button>
```

Ключи называем по продуктовой роли, а не по месту в DOM.

## Feature как black box

Feature должна выглядеть как независимый black box с понятным API.

Feature может зависеть от:

- своих внутренних файлов;
- `entities`;
- `shared`;
- явно переданных props/deps.

Feature не должна импортировать внутренние файлы соседней feature.

Плохо:

```ts
import { buildComposerDraft } from '../send-message/hooks/internal/buildComposerDraft';
```

Хорошо:

```ts
import { SendMessageForm } from '../send-message/SendMessageForm/Component';
```

Feature должна быть удобной для тестирования на моках. Внешние зависимости передаются через props, adapter API или mockable store/API слой.

## CSS

Стили должны повторять структуру компонента. Для component-specific стилей используем SCSS Modules:

```text
MessageCard/
  Component.tsx
  Component.module.scss
```

Global styles и design tokens лежат отдельно:

```text
shared/styles/
  tokens.css
  globals.css
```

Не складываем все стили приложения в один огромный `styles.css`.

## Адаптивность

UI должен нормально работать в разных контейнерах:

- web page;
- VS Code sidebar;
- VS Code editor panel;
- desktop window.

Нельзя верстать только под один размер экрана или одну среду запуска.

Для layout используем:

- flexible containers;
- `min/max-width`;
- `grid` или `flex`;
- container-friendly размеры;
- переносы текста;
- состояния для узких контейнеров.

Компонент не должен ломаться из-за длинного текста, узкой панели, маленькой высоты или отсутствия hover.

## Импорты

Не используем `index.ts` barrel-файлы.

Компоненты импортируют напрямую нужный файл:

```ts
import { MessageCard } from '../../entities/message/MessageCard/Component';
```

Feature может импортировать `entities` и `shared`, но не внутренности другой feature.

Плохо:

```ts
import { buildPromptDraft } from '../send-message/internal/buildPromptDraft';
```

Хорошо:

```ts
import { Button } from '../../shared/ui/Button/Component';
```

## Тесты

Тесты лежат в `__tests__` рядом с тестируемой частью.

```text
features/send-message/
  SendMessageForm/
    Component.tsx
    hooks/
      useSendMessage.ts
      __tests__/
        useSendMessage.test.ts
    __tests__/
      Component.test.tsx
```

Для store/actions тестируем state transitions. Для компонентов тестируем видимое поведение, а не внутреннюю реализацию.

UI пишем так, чтобы e2e-тесты на моках было легко добавить позже:

- стабильные `data-test-id`;
- предсказуемые UI states;
- нет скрытых прямых обращений к host API из компонента;
- transport можно заменить mock adapter-ом;
- важные user flows имеют понятные entrypoints.

## Стратегия тестирования UI

Web UI — основная среда для быстрых e2e-тестов общего интерфейса.

В web e2e на mock adapter проверяем:

- основные user flows;
- shared UI поведение;
- store/actions;
- i18n;
- loading/empty/error/success states;
- формы;
- responsive layout.

VS Code и desktop не должны дублировать все web e2e-сценарии. Для них нужны короткие smoke/e2e проверки:

- UI запускается в контейнере среды;
- adapter подключается;
- transport работает;
- theme/container sizes не ломают layout;
- 2-3 критичных user flows проходят через реальный host lifecycle.

Любой новый user flow должен быть проверяемым на трёх уровнях:

- Storybook state для визуального состояния;
- unit/store test для логики;
- web e2e на mock adapter для пользовательского сценария.

Так web остаётся оркестратором и тестовой площадкой общего UI, а VS Code/desktop проверяют только свои adapter-риски.

## Storybook

Для shared/entity/сложных feature-компонентов добавляем Storybook states.

Минимальный набор:

- default;
- loading/pending;
- empty;
- error;
- disabled;
- long content;
- narrow/mobile width, если компонент может сжиматься.

Template-компонент должен рендериться в Storybook без daemon, VS Code, browser adapter и настоящего network.

## Комментарии

Комментарии пишем как продуктовый контекст:

- зачем нужен сценарий;
- какую пользовательскую проблему решает;
- почему поведение именно такое.

Не пересказываем JSX или очевидные действия.

## KISS

No clever code.

Предпочитаем простые компоненты, простые hooks, явные actions и понятный flow. Если компонент тяжело прочитать сверху вниз, его нужно разделить.
