# Webview Design System для AIST

Этот документ описывает визуальный язык webview-интерфейса AIST и может быть добавлен в системный prompt ИИ-агента. Используй его как инструкцию при вёрстке новых экранов, фич и компонентов в `src/webview`.

## Главный принцип

Интерфейс AIST — это VS Code-native, macOS-like webview: компактный, полупрозрачный, с мягкими скруглениями, тонкими границами, аккуратными тенями и минимальным количеством визуального шума. Новый UI должен выглядеть как часть панели VS Code, а не как отдельное веб-приложение.

Всегда переиспользуй компоненты из `src/webview/shared/ui` и стили VS Code theme tokens. Не создавай произвольные кнопки, поля, карточки, модалки и селекты, если уже есть shared-компонент.

## Базовые правила окружения

- Основные цвета берутся из CSS-переменных VS Code: `--vscode-editor-background`, `--vscode-foreground`, `--vscode-descriptionForeground`, `--vscode-input-background`, `--vscode-input-foreground`, `--vscode-button-background`, `--vscode-focusBorder`, `--vscode-errorForeground` и аналогичных.
- Общая граница проекта: `--agent-border`, для input-like элементов: `--agent-input-border`.
- Фон страницы обычно `var(--vscode-editor-background)` или прозрачный внутри уже окрашенного root.
- Не задавай жёсткие светлые/тёмные темы. UI обязан корректно работать в любой теме VS Code.
- Используй `color-mix(in srgb, ...)` для мягких tint-цветов, hover-состояний, фонов карточек и статусов.
- Глобально ожидается `box-sizing: border-box`; компоненты должны иметь `min-width: 0`, если живут во flex/grid и могут сжиматься.
- Избегай горизонтального скролла. Для длинных строк используй `overflow: hidden`, `text-overflow: ellipsis`, `white-space: nowrap` или `overflow-wrap: anywhere` в текстовых областях.

## Визуальная пластика

### Скругления

- Главные поверхности: `border-radius: 24px` + `corner-shape: squircle`, если это карточка, composer, modal surface или крупная панель.
- Средние controls: `14px–16px`.
- Малые controls: `10px–12px`.
- Pills, badges, круглые icon buttons: `999px`.
- Checkbox box: около `7px`.

### Границы и поверхности

- Почти все поверхности имеют `1px solid var(--agent-border)` или border через `color-mix` с акцентом.
- Фон не должен быть плоско ярким: используй полупрозрачные смеси с `var(--vscode-editor-background)`, `var(--vscode-input-background)` или `var(--vscode-editor-inactiveSelectionBackground)`.
- Для elevated-поверхностей допустимы мягкие тени: `0 14px 34px rgb(0 0 0 / 0.2)` или похожие значения.
- Для glass-like панелей допустим `backdrop-filter: blur(20px–24px) saturate(1.3–1.35)` с `-webkit-backdrop-filter`.

### Отступы

- Микро-gap между иконкой и текстом: `5px–8px`.
- Внутренние отступы компактных элементов: `2px 8px`, `5px 7px`, `8px 12px`.
- Карточки и модалки обычно используют `10px–14px` padding.
- Разделы настроек и modal body часто используют `12px` gap/padding.
- Нижний Composer имеет внешние отступы `24px 12px` и максимальную ширину `768px`.

## Типографика

Используй компонент `Text`, когда нужен текстовый блок с единым стилем и безопасной HTML-вставкой.

Доступные варианты:

- `display`: 24px, 800, плотный крупный заголовок.
- `title`: 18px, 750.
- `subtitle`: 14px, 600, muted color.
- `body`: 13px, обычный текст, line-height около 1.55.
- `bodyStrong`: 13px, 700.
- `caption`: 11px, muted, для метаданных.
- `code`: 12px, monospace-like через editor font, с рамкой и code background.
- `quote`: 13px italic, left border.
- `danger`: 13px, error color, 650.

Общие правила:

- Основной UI-текст чаще всего 12–13px.
- Метаданные, подписи, compact controls: 10–11px.
- Заголовки карточек: 14px, 700–800.
- Используй `var(--vscode-editor-font-family)` как базовый font family.
- Для muted текста используй `var(--vscode-descriptionForeground)`.
- Для ссылок — `var(--vscode-textLink-foreground)` и active foreground на hover.

## Shared UI: используй эти компоненты

Импортируй из `src/webview/shared/ui`:

```tsx
import {
  Badge,
  Button,
  Card,
  Checkbox,
  ComposerFrame,
  KeyboardShortcut,
  ModalBackdrop,
  ModalHeader,
  ModalSurface,
  Select,
  Switch,
  Text,
  TextArea,
  TextField
} from '../../shared/ui';
```

Путь импорта подбирай относительно файла.

### Button

Компонент: `Button`.

Варианты:

- `primary` — главное действие.
- `secondary` — действие по умолчанию.
- `ghost` — тихое действие без постоянной заливки.
- `danger` — опасные действия.
- `tactile` — заметная физичная кнопка, используется для primary micro-action вроде send/stop в Composer.

Размеры:

- `sm`: 30px height, 12px text.
- `md`: 36px height, 13px text.
- `lg`: 44px height, 14px text.

Правила:

- Не делай свои button-классы с нуля; используй `Button`.
- Для icon-only действий ставь `iconOnly`, `aria-label` и/или `title`.
- Для круглой кнопки — `shape="round"`.
- У кнопок есть focus ring через `--vscode-focusBorder`, active transform и disabled opacity. Не ломай эти состояния.
- `tactile` имеет градиент, inset shadow и при hover слегка поднимается; используй его редко, для ключевого действия.

### ComposerFrame и Composer

Composer — главный паттерн нижней формы ввода. Он собирается из `ComposerFrame`, `TextArea variant="composer"`, `KeyboardShortcut`, `Button variant="tactile"`, `CompactNavigationButton`.

Структура ComposerFrame:

- `notice` над панелью — предупреждение или approval notice.
- `header` — быстрые настройки, summary, controls.
- `headerActions` — компактные кнопки справа.
- `input` — центральная зона ввода.
- `footer` — метаданные слева снизу.
- `actions` — shortcut и send/stop справа снизу.
- `fallback` — текст, если header пуст.

Визуальные правила Composer:

- Максимальная ширина панели: `min(100%, 768px)`, центрирование через `margin: 0 auto`.
- Главная панель: `border-radius: 24px`, `corner-shape: squircle`, `border: 1px solid var(--agent-border)`.
- Фон: прозрачный input background mix, glass blur `24px`, saturate `1.35`.
- При `focus-within` меняется border на `--vscode-focusBorder` и появляется мягкий focus shadow.
- Floating mode закрепляет composer снизу и добавляет нижний gradient overlay; у wrapper `pointer-events: none`, у panel — `pointer-events: auto`.
- Composer-анимации используют только `transform` и `opacity`, duration около `500ms`, easing `cubic-bezier(0.22, 1, 0.36, 1)`.
- Всегда учитывай `prefers-reduced-motion: reduce` и сокращай анимации до `1ms` или отключай.

Поведение Composer:

- `Ctrl/Cmd + Enter` отправляет prompt.
- Стрелка вверх/вниз может листать историю prompt, когда курсор в начале/конце.
- Пустой prompt отправляет continue-сценарий, а не ошибку.
- После отправки старый composer может «улетать» вверх, новый появляется снизу; во время exit старый слой не должен перехватывать клики.
- Send/stop кнопка не должна иметь transition, если состояние `busy` меняется часто.

### TextArea и TextField

Используй `TextArea` для длинного текста и `TextField` для однострочного ввода.

Правила:

- Label: 12px, 700, muted.
- Hint/error: 11px.
- Default input surface: border 1px, radius 14–16px, background mix с `--vscode-input-background`, inset highlight.
- Focus: `--vscode-focusBorder` + внешний ring через `color-mix(... 18%, transparent)`.
- Error: `--vscode-errorForeground` + error ring.
- `TextArea variant="composer"` — без border/background, min-height 48px, max-height 300px, resize none, font-size 12px, line-height 1.5, `overflow-wrap: anywhere`.

### Select

Компонент: `Select`.

Правила:

- Используй custom Select, а не native visible `<select>`.
- Размеры: `md` для обычных форм, `sm` для compact summary/composer controls.
- Select поддерживает `options`, `categories`, `placeholder`, `leadingIcon`, `displayLabels`, `searchable`.
- Trigger: height 38px (`md`) или 28px (`sm`), radius 14px или 10px.
- Dropdown рендерится в portal, position fixed, z-index 10000, radius 16px, blur 20px, мягкая shadow.
- Search внутри dropdown: height 30px/28px, radius 10px.
- Категории — uppercase 10px, 800, sticky внутри dropdown.
- Активный option использует `--vscode-list-activeSelectionBackground`; hover — `--vscode-list-hoverBackground`.

### Card

Компонент: `Card`.

Тона:

- `default` — обычная секция.
- `elevated` — более важная поверхность с тенью.
- `accent` — выделенная секция с textLink tint.

Правила:

- Card — `section`, radius 24px, squircle, padding 14px.
- Header: title 14px 800, description 12px muted, actions справа.
- Body имеет `margin-top: 12px`.
- Не создавай ad-hoc карточки, если подходит `Card`.

### Badge

Компонент: `Badge`.

Тона:

- `neutral`, `accent`, `success`, `warning`, `danger`.

Правила:

- Badge — compact pill: radius 999px, padding `2px 8px`, font-size 11px, font-weight 700.
- Используй для статусов, коротких метаданных, labels.
- Для статусов с иконкой используй `icon` prop.

### Compact controls

Компоненты:

- `CompactControlGroup`
- `CompactControlItem`
- `CompactNavigationButton`
- `ContextUsageIndicator`

Правила:

- Используй их для header/footer composer-like панелей, summaries и мелких настроек.
- Compact text: 10–11px, muted.
- `CompactNavigationButton`: height 26px, pill, border `--agent-input-border`, background mix с input background.
- Icon-only compact button: width 26px.
- `ContextUsageIndicator` использует маленький conic-gradient pie 16px.

### Modal

Компоненты:

- `ModalBackdrop`
- `ModalSurface`
- `ModalHeader`
- `ModalCode`

Тона:

- `default`
- `approval`
- `error`

Размеры:

- `default`: width до 760px, max-height 78vh/720px.
- `settings`: width до 980px, max-height 88vh/900px.

Правила:

- Backdrop fixed inset 0, z-index 100; approval z-index 120 и blur 10px.
- Surface: radius 24px, squircle, border, editor background, shadow `0 18px 54px rgb(0 0 0 / 0.35)`.
- Header: padding 12px, bottom border, title 13px, description 11px muted.
- `approval` использует amber `#f59e0b`; `error` использует `--vscode-errorForeground`.
- Для длинного текста/stack trace используй `ModalCode`.

### Checkbox и Switch

Правила:

- Используй `Checkbox` для независимых boolean-параметров, `Switch` для включения/выключения режима.
- Label: 13px, 700; description: 11px, muted.
- Checkbox box: 19px, radius 7px.
- Switch track: 42x24px, thumb 18px, active background `--vscode-button-background`.
- Focus ring такой же, как у остальных controls.
- Disabled: opacity около 0.55 и cursor not-allowed.

### KeyboardShortcut и Keycap

Правила:

- Используй `KeyboardShortcut` для подсказок горячих клавиш в Composer и controls.
- Keycap: min-width 18px, height 18px, radius 5px, gradient, border-bottom темнее, font-size 10px, weight 700.
- Label shortcut — 10px muted.

### CodeBlock

Правила:

- Используй `CodeBlock` для отображения кода/JSON/сырых данных.
- Кодовые блоки имеют border, radius 10px, background `--vscode-textCodeBlock-background`, padding 10px.
- Для компактного preview ограничивай max-height около 180px.

## Chat и message-паттерны

### MessageCard

Сообщения выглядят как squircle cards с radius 24px, padding 10px, margin-bottom 12px.

Роли:

- `user`: отделяется сверху большим margin-start 48px, имеет accent border/background через `--vscode-textLink-foreground`.
- `assistant`: мягкий фон через `--vscode-editor-inactiveSelectionBackground`.
- `status`: dashed border, muted text.
- `error`: border и text `--vscode-errorForeground`.

Markdown внутри сообщения:

- Base 13px, line-height 1.6.
- Абзацы/списки/blockquote/pre/table: margin `0.65rem 0`.
- Inline code: border, radius 4px, code background, editor font.
- Pre: overflow auto, border, radius 6px, padding 0.75rem.
- Blockquote: left border 3px, muted text.

### ToolMessageCard

Tool-call карточки компактные и раскрываемые.

Правила:

- Radius 24px, border tint через CSS-переменную `--tool-tone`, background mix с editor background.
- Header row: chevron button 24px, icon pill 24px height, title 12px 700.
- Tool tone palette: blue, green, purple, amber, rose, cyan, slate.
- Status badge: pill, 11px, border `--agent-border` или error border.
- Approval feedback показывается отдельным блоком с green/error tint и не смешивается с JSON-result.
- Для раскрытия chevron вращается на 90deg по `aria-expanded='true'`.

## Layout-паттерны страниц

- Root страницы обычно: `display: flex`, `height: 100vh`, `overflow: hidden`, `flex-direction: column`, `min-width: 0`, color `--vscode-foreground`.
- Для списков и scroll-зон явно задавай `overflow-y: auto`, `overflow-x: hidden`, `min-width: 0`, `min-height: 0`.
- Для responsive compact layout используй `clamp(...)` и media query около `420px`/`768px`, а не фиксированные ширины.
- В compact header summary селекты имеют `width: clamp(...)`, чтобы помещаться в VS Code sidebar.
- Группы actions: `display: flex`, `align-items: center`, `gap: 6px–8px`, `flex-shrink: 0`.

## Интерактивные состояния

Обязательные состояния для интерактивных элементов:

- `:hover:not(:disabled)` — мягко меняет background/border/color.
- `:active:not(:disabled)` — лёгкий `translateY(1px)` или `scale(0.99)`; tactile может сильнее.
- `:focus-visible` — без outline, но с border/focus shadow через `--vscode-focusBorder`.
- `:disabled` — opacity около `0.52–0.55`, cursor not-allowed/default, без transform.

Не удаляй focus-visible состояния ради визуальной чистоты: webview должен быть доступным с клавиатуры.

## Анимации

- Используй короткие transition `120–160ms ease` для background, border-color, box-shadow, opacity, transform.
- Для модалок: около `180ms`, surface входит через `translateY(8–10px) scale(0.98)` и opacity.
- Для composer send transition: `500ms`, только `transform` и `opacity`, GPU-friendly `translate3d`.
- Для loading/streaming можно использовать shimmer текста или spin icon.
- Всегда добавляй `@media (prefers-reduced-motion: reduce)`.
- Не анимируй layout-свойства без необходимости; предпочитай transform/opacity.

## Иконки

- Используется `lucide-react`.
- Размеры иконок:
  - compact controls: 12–14px;
  - обычные controls: 14–16px;
  - modal/status icons: около 24–34px в pill/circle.
- Иконки должны быть `flex-shrink: 0`.
- Для icon-only кнопок обязательно добавляй `aria-label` и `title`, если смысл не продублирован текстом.

## Цветовые семантики статусов

- Accent/link: `var(--vscode-textLink-foreground)`.
- Success: `#4ade80`.
- Warning/approval: `#f59e0b`.
- Danger/error: `var(--vscode-errorForeground)` или rose `#f87171/#fb7185` для вторичных статусов.
- Busy/info: `#38bdf8` или cyan `#22d3ee`.
- Tool/purple: `#a78bfa`.
- Всегда смешивай статусный цвет с прозрачностью или editor background, не заливай большие блоки чистым цветом.

## Что нельзя делать

- Не использовать Tailwind или inline style вместо существующих SCSS module паттернов, кроме вычисляемых значений вроде conic-gradient percent.
- Не создавать новые глобальные CSS-классы для UI-компонентов; используй CSS Modules.
- Не хардкодить цвета, если есть VS Code token; исключения — статусные оттенки success/warning/tool palette.
- Не создавать новый Button/Select/Card/Modal/TextArea, если shared-компонент уже покрывает задачу.
- Не задавать крупные fixed width без `min(100%, ...)`, `clamp(...)` или responsive fallback.
- Не допускать горизонтальный скролл внутри webview/sidebar.
- Не скрывать focus outline без замены на focus-visible ring.
- Не использовать большие яркие тени или Material-like elevation; стиль должен быть мягким и компактным.

## Рекомендации для ИИ-агента при вёрстке

1. Сначала проверь `src/webview/shared/ui/index.ts` и выбери существующие shared-компоненты.
2. Если нужен новый reusable элемент — положи его в `src/webview/shared/ui/<component>` с `Component.tsx`, `Component.module.scss`, `index.ts`, при необходимости stories.
3. Если элемент доменный — держи его в `features`, `entities`, `widgets` или `pages`, но собирай из shared UI.
4. Пиши стили через SCSS Modules, сохраняя BEM-like простые class names: `.root`, `.header`, `.body`, `.actions`, `.title`, `.description`.
5. Используй comments только там, где объясняется нетривиальное поведение, performance или accessibility.
6. Для форм всегда добавляй label/hint/error, если это не compact control.
7. Для modal/overlay используй shared modal parts и корректный z-index.
8. Для новых animations добавляй reduced-motion branch.
9. После вёрстки проверь narrow sidebar: длинные тексты должны обрезаться или переноситься, а controls не должны ломать ширину.

## Короткий пример правильной композиции

```tsx
<Card
  tone="elevated"
  title="Model settings"
  description="Choose how the agent responds in this workspace."
  actions={<Badge tone="accent">Workspace</Badge>}
>
  <Select label="Model" options={modelOptions} value={model} onValueChange={setModel} searchable />
  <Switch label="Streaming" description="Show tokens while the model is responding." checked={streaming} />
  <Button variant="primary" size="sm">
    Save
  </Button>
</Card>
```

Визуально это должно дать компактную squircle-карточку с muted description, VS Code-aware select, аккуратным switch и стандартной primary action.
