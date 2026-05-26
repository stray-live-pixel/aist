---
title: Storybook секции
contexts:
  - mode: continue-from
    from: 3
summary_rules: |
  Только список:
  - файлы стори,
  - состояния/варианты, которые добавлены;
  - риски по отсутствию мобильных/скелетон/темных кейсов.
---

# Задача этапа

Подготовить и обновить Storybook артефакты секции отдельно от README и кода.

Используй `storybookContract`, `defaultPropsContract` и `referenceSections` из `Project Context Pack` в `01-planning.md`. Не подбирай заново эталоны и decorators, если они уже зафиксированы.

# Что сделать

1. Добавить/обновить `[SectionName].stories.tsx`.
2. Обязательные настройки:

- `component` и `title` в стиле `Sections/<domain>/<SectionName>`;
- `tags: ['autodocs']`;
- README секции подключен в docs через `<Title>` / `<Description>`;
- декораторы подбери по ближайшему эталону из `01-planning.md`:
  - для SP-секций часто нужны `withDomainParams` и `withGetParamsMock({ mode: Mode.PLUS_SITE })`;
  - дополнительные декораторы (`withDefaultStyles`, `withSPLevels`, wrapper и т.п.) добавляй только если они нужны конкретной секции или есть в близких примерах;
- `modifyStoryParams` для всех историй.

3. Обязательные истории:

- Имена stories выбирай по локальному стилю секции (`Section`, `Skeleton`, `MobileLight`, `DesktopDark` и т.п.), не переименовывай существующие без нужды.
- Минимум должен покрывать обычное состояние.
- Добавь mobile/desktop-варианты, если layout отличается по ширине.
- Добавь skeleton-story, если у секции есть скелетон-обработка.
- Добавь dark-варианты, если секция поддерживает темную тему
  или ранее уже имела визуальные различия в тёмной теме.
- Добавь отдельный dark skeleton, если он визуально отличается.

4. Источники данных:

- `defaultConfiguration` из `./__default-props__/index.ts`.
- Не инлайни крупные шорткаты прямо в story, если их можно вынести в `__default-props__`.
- Базовые статусы:
  - `shortcutsStatus: SectionStatus.Success`
  - `metaShortcutsStatus: SectionStatus.Success`
  - корректный `viewType` из `SectionViewType`
  - `sectionPositionInConfig: 1`.

5. Проверки содержимого:

- `stories` используют реальные типы данных (не `as any`, если есть аналоги).
- Есть `skeleton`-story если секция имеет скелетон-обработку.
- На мобильной истории передан `wrapperParams`/`device` корректно.
- Названия ролей/типов в story совпадают с `README.md` и кодом контроллера.

6. Закрытие этапа:

- Убедись, что storybook-истории отражают публичные режимы секции: desktop/mobile и, при наличии, dark.
