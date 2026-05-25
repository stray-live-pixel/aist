# ModelSelect

Searchable dropdown выбора модели OpenRouter или ChatGPT Codex.

## Состав

- `ModelSelect.tsx` — React-компонент, фокус поиска и IPC выбора модели.
- `ModelSelect.module.scss` — локальные стили без Tailwind utility-классов.
- `types.ts` — публичные props и display model группы провайдера.
- `utils.ts` — fallback выбранной модели, фильтрация и группировка.
- `ModelSelect.stories.tsx` — изолированные Storybook-сценарии.

## Инварианты

- Если текущий `model` отсутствует в списке, компонент показывает fallback-опцию с тем же id.
- При `disabled` dropdown закрывается и очищает поиск.
- Порядок групп фиксирован: OpenRouter, затем ChatGPT Codex.
