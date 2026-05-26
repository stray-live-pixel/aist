---
title: Контекст проекта и планирование
contexts: []
summary_rules: |
  Сформируй детальный reusable context pack для следующих этапов.
  Только факты, с путями к файлам и именами сущностей.
  Обязательно включи:
  - правила разработки секций;
  - архитектурные паттерны и точки интеграции;
  - релевантные эталонные секции;
  - найденные утилиты/типы/декораторы/storybook/test-команды;
  - конкретный план текущей секции.
---

# Задача этапа

Собрать полный и детальный контекст по проекту один раз, чтобы следующие этапы использовали готовый пакет и не тратили время на повторное изучение базовых правил, типовых секций и инфраструктуры.

Этот этап не пишет production-код. Его результат — `Project Context Pack` + план текущей секции.

# Артефакт этапа

В конце этапа зафиксируй явно и достаточно подробно в таком виде (поля можно дополнять):

## Project Context Pack

- `sourceOfTruth`: какие файлы прочитаны и зачем.
- `architectureMap`: как устроена секция в этом проекте:
  - root-компонент;
  - `SectionController`;
  - `CommonSectionController` или специализированный аналог;
  - `SectionMetricsTemplate` / `MetricsTemplate` / `TemplateBuilder`;
  - `HomeAction`;
  - `Skeleton`;
  - `components` / `controllers` / `utils` / `hooks`;
  - `index.ts` и публичные экспорты.
- `shortcutContract`:
  - как разделяются `shortcuts` и `metaShortcuts`;
  - как используется `additionalData.type`;
  - какие утилиты применяются для фильтрации и чтения `additionalData`;
  - как передаётся `isMeta: true`.
- `renderSafetyContract`:
  - правила для `SafeHtmlReplacer`;
  - правила для `PreparedImage`;
  - правила для actions и метрик.
- `styleContract`:
  - как устроены SCSS-модули;
  - как накладываются пользовательские стили из `additionalData`;
  - где нужен `expandShorthandStyles`;
  - как именуются и пробрасываются `dataTestId` / `data-test-id`.
- `registryContract`:
  - где лежит `SectionViewType`;
  - где лежит `features/sections/config`;
  - как оформлены `dir`, `Component`, `Skeleton`, `isAlwaysHydrated`;
  - чем отличается новый тип от доработки существующего.
- `defaultPropsContract`:
  - где лежит `__default-props__/index.ts`;
  - как экспортируются именованные `IShortcut`-константы;
  - как собирается `defaultConfiguration`;
  - как оформляется `additionalData`.
- `storybookContract`:
  - какие decorators используются;
  - как подключается README через autodocs;
  - как применяется `modifyStoryParams`;
  - какие story-состояния нужны для этой задачи.
- `documentationContract`:
  - что должен содержать README секции;
  - какие поля/роли должны совпадать с кодом и storybook.
- `validationContract`:
  - какие npm-команды есть в `package.json`;
  - какие проверки нужны при изменении кода секции, SCSS, storybook, config, types;
  - когда нужны unit/Hermione/storybook checks.
- `referenceSections`: 1-3 выбранных эталона:
  - путь;
  - почему релевантен;
  - что брать из структуры;
  - что не переносить.
- `reuseNotes`: что следующим этапам можно считать уже изученным и не перечитывать без причины.

## Section Plan

- `sectionName`: ...
- `isNewSection`: true | false
- `targetPath`: ...
- `sectionViewType`: ...
- список ролей по `additionalData.type`;
- `sectionDomain` (`SP` или `pages/...`);
- `storybookReference`: 1-3 ближайших story-файла;
- `validationProfile`: какие проверки ожидаемо понадобятся;
- список затрагиваемых файлов для следующего этапа;
- список ключевых рисков.

Минимальные требования к полям:

- `sectionName`, `isNewSection`, `targetPath`, `sectionViewType` — обязательны всегда;
- `sectionName` должен совпадать с именем корневой папки/компонента в коде;
- для `sectionDomain: pages/...` укажи конкретный модуль после `pages/`.
- `Project Context Pack` должен быть достаточно подробным, чтобы `02-scaffold.md` ... `08-tests.md` могли ссылаться на него вместо повторного чтения `DEVELOPMENT.md`, `package.json` и эталонных секций.

# Что сделать

1. Собрать исходные правила и инфраструктуру

- Прочитать и зафиксировать:
  - [DEVELOPMENT.md](/Users/kirilleremin/arcadia/plus/frontend/plus-next/apps/sp/DEVELOPMENT.md) (базовые правила разработки секций);
  - существующий flow-формат и правила запуска из `.index.md` текущего flow.
- Прочитать `package.json` и зафиксировать релевантные команды:
  - lint/type-check;
  - storybook build;
  - test;
  - Hermione/storybook Hermione, если применимо.
- Найти и зафиксировать реальные пути:
  - `src/shared/types/section-view-type.ts`;
  - `src/features/sections/config.ts`;
  - `src/shared/utils/sp/*`;
  - `src/shared/utils/expand-shorthand-styles.ts`;
  - `src/shared/ui/SafeHtmlReplacer`;
  - `src/shared/ui/PreparedImage`;
  - `src/features/home-core/components`;
  - `src/features/sections/SectionsBuilder`;
  - `src/features/storybook/decorators`;
  - `src/features/storybook/utils/modifyStoryParams`.

2. Подтвердить архитектурные якоря

- Определить, какая архитектура нужна:
  - `CommonSectionController` + `SectionController` + рутовый компонент;
  - где нужны `controllers` / `hooks` / `utils`.
- Для `sectionDomain: pages/...` отдельно изучить локальные секции этого модуля и не переносить без проверки паттерны `src/widgets/SP`.

3. Изучить схожие секции

- Выбрать 1-3 эталонные секции с похожей структурой и зафиксировать:
  - где лежат файлы;
  - как устроен root-компонент;
  - как устроен controller и фильтрация шорткатов;
  - как устроены `index.ts`, `components/index.ts`, `utils/index.ts`;
  - как устроены story, default props, skeleton;
  - как подключены README/autodocs/decorators;
  - как подключена секция в `config`;
  - есть ли дополнительные требования к `additionalData` и типизации.
- Не ограничивайся названиями файлов: зафиксируй конкретные паттерны импортов/экспортов и то, что нужно повторить в текущей секции.

4. Определить тип работы

- Чётко зафиксировать: новая секция или доработка существующей.
- Если новая секция — зафиксировать, что основной этап реализации получает каркас из `02-scaffold.md`.

5. Подготовить технический план секции

- Уточнить:
  - тип секции и интеграционные точки (`section-view-type`, `features/sections/config`);
  - роли шорткатов и их `additionalData.type`;
  - обязательные фичи (metrics/actions/states/Skeleton/стили/темизация);
  - нужен ли `isAlwaysHydrated`, и почему;
  - тестовый профиль (юнит/storybook/hermione, если применимо).

6. Зафиксировать риски до кода

- Проверить заранее:
  - отсутствие обязательного `additionalData.type`;
  - пустые/неконсистентные `shortcuts` и `metaShortcuts`;
  - расхождение между `README`, `stories` и фактической структурой секции.
  - расхождение паттернов `src/widgets/SP` и `src/pages/.../sections`;
  - неочевидные требования к контекстам/декораторам storybook;
  - команды, которые могут быть дорогими или зависеть от внешней инфраструктуры.

7. Подготовить входящие артефакты для следующего этапа

- Сформировать короткий чеклист согласований:
  - что будет меняться в `src/shared/types/section-view-type.ts`;
  - что будет меняться в `src/features/sections/config.ts`;
  - какие файлы секции и сторибука будут затронуты.

8. Правило переиспользования контекста для следующих этапов

- Явно напиши, какие выводы следующие этапы должны использовать без повторного поиска.
- Повторно открывать базовые файлы (`DEVELOPMENT.md`, `package.json`, выбранные эталоны) нужно только если:
  - найдено противоречие с текущей задачей;
  - изменился файл в ходе flow;
  - нужен конкретный фрагмент для точной правки.
