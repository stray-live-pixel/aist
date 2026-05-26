---
title: Реализация секции
contexts:
  - mode: continue-from
    from: 2
summary_rules: |
  Если в ходе работы нужен короткий бэкпорт-фидбек, пиши фактически:
  - какие файлы будут затронуты;
  - какие из них обязательны для запуска секции в продакшн;
  - какие архитектурные решения уже приняты.
---

# Задача этапа

Реализовать новую секцию или доработать существующую.

# Контекст и ограничения

Используй `Project Context Pack` из `01-planning.md` и результаты `02-scaffold.md`. Не трать время на повторное изучение `DEVELOPMENT.md`, `package.json` и эталонных секций, если в context pack уже есть нужные правила. Повторно открывай файлы только для точной правки или проверки противоречия.

Работай строго по правилам из `DEVELOPMENT.md`:

- `additionalData.type` — обязательный дискриминатор шорткатов;
- мета и обычные шорткаты в разные массивы (`shortcuts` и `metaShortcuts`);
- интерактивные элементы через метрики (`MetricsTemplate`/`HomeAction`).
- `HomeAction` размещай внутри wrapper-элемента, не снаружи.
- Пользовательские стили из `additionalData` накладывай поверх дефолтов и прогоняй через `expandShorthandStyles`.
- Не добавляй `useMemo`/`memo` заранее без измеренной проблемы.

# План имплементации

1. Определи сценарий задачи

- Если задача на создание новой секции: убедись, что этап `02-scaffold.md` уже выполнил каркас и подключение типа/конфига.
- Если задача на доработку существующей секции: переходи к п.2, сохраняя существующую архитектуру и обратную совместимость.

2. Карта типа секции и интеграция

- Определи место секции:
  - для нового типа проверь корректность уже добавленного ранее `SectionViewType`/`config` (этап `02-scaffold.md`);
  - для существующего типа не добавляй новый enum, только `config`/код секции.
- Зафиксируй `isAlwaysHydrated`, если секция критична для первого рендера.

3. Каркас секции
   Создай/открой папку из `targetPath`, зафиксированного в `01-planning.md`.

- Для `sectionDomain: SP` основной стиль: `src/widgets/SP/<SectionName>/`.
- Для `sectionDomain: pages/...` используй локальный стиль `src/pages/<module>/sections/...`.
  Рекомендуемый минимум:
- `<SectionName>.tsx` (root рутовый файл секции);
- `index.ts`;
- `__default-props__/index.ts` с `defaultConfiguration`;
- `types.ts` (локальные типы);
- `components/`:
  - `Skeleton` + бизнес-компоненты;
  - `components/index.ts`;
- `controllers/SectionController.tsx` (и `controllers/index.ts`, если нужно);
- опционально `utils/` и `hooks/` для выделения преобразований.
- Презентационные компоненты держи в формате folder-per-component: `ComponentName/Component.tsx` + `Styles.module.scss`.
- В `__default-props__` экспортируй именованные `IShortcut`-константы + агрегат `defaultConfiguration`; `additionalData` пиши через `JSON.stringify`.

4. Рутовый файл секции

- Компонент рутовой секции принимает `ISectionComponentProps`.
- Обязательно используй `SectionController`, построенный на `CommonSectionController` (или его специализированном аналоге).
- Добавь:
  - `SectionMetricsTemplate`;
  - условие скелетона по `shouldShowSkeleton`/`renderSkeletonOnSSR`;
  - слоты/`children` через `TemplateBuilder` или явную композицию.

5. Контроллер/данные секции

- Реализуй `SectionController` по шаблону render-props.
- Делай сегментацию шорткатов через существующие утилиты:
  - `filterByAdditionalTypeShortcut` из `src/shared/utils/sp/filter-by-additional-type`;
  - `filterShortcutsByAdditionalType` из `src/shared/utils/sp/filter-shortcuts-by-additional-type`;
  - по одной роли (header/settings/list-item/actions/meta и т.д.);
  - без логики «первый элемент массива».
- Для сложных правил:
  - вынеси парсинг из `additionalData` в `get-section-settings.ts` или похожий утилитарный файл;
  - используй `getAdditionalData`, `resolveShortcutData*`, если есть общая полезная нагрузка.

6. Презентационные компоненты и стили

- Для доминирующей отрисовки делай отдельные компоненты:
  - минимум: `Outer` + `Inner` (или аналог).
- Не смешивай бизнес-логику и render.
- Стили:
  - в SCSS дефолты по умолчанию;
  - пользовательские стили из `additionalData` через spread поверх дефолтов.
- Для перезаписи шорткатных стилей используй `expandShorthandStyles`, чтобы не потерять long-hand.
- Все `data-test-id` только через `dataTestId` в пропсах (`data-test-id` не пишем прямо в JSX-объектах).

7. Action/метрики/визуал

- Все интерактивы рендери через `HomeAction`.
- Метрики для клика/открытия в нужном слое через `MetricsTemplate`/`TemplateBuilder`.
- Для мета-шортката, который участвует в метриках, передавай `isMeta: true`.
- В тексте только `SafeHtmlReplacer`.
- Изображения только через `PreparedImage`.

8. Скелет проекта и сборка

- Заверши кодовую реализацию в пределах `targetPath` и связанных модулей.
- После этого передай задачу на отдельный stage `04-storybook.md` для документационно-визуальных артефактов.

9. Валидация интеграции в коде

- Проверь импорты в:
  - `src/shared/types/section-view-type.ts`;
  - `src/features/sections/config.ts`;
  - `targetPath` секции на корректные алиасы `@/...` и отсутствие циклических зависимостей.
- Удостоверься, что рутовый экспорт секции и `Skeleton` доступны.

10. Нейтральная проверка поведения (без запуска тестов)

- Для правок existing-секции обязательно сохранение обратной совместимости:
  - существующие типы шорткатов;
  - отсутствие изменения API пропсов секции;
  - fallback для отсутствующих `additionalData.type`.
