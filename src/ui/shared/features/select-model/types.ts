import type { ModelOption } from '../../shared/types';

/**
 * Что это: публичные props выбора модели.
 * Зачем нужно: компонент сам управляет раскрытием и отправляет выбранную модель в extension через IPC, поэтому наружу отдаётся только актуальное состояние и доступные опции.
 */
export type ModelSelectProps = {
  /** Текущий id модели; если модели нет в списке, компонент строит fallback-опцию. */
  model: string;
  /** Список моделей, полученный от extension или Storybook fixtures. */
  models: ModelOption[];
  /** Отключает выбор и закрывает раскрытый список, когда настройки временно недоступны. */
  disabled?: boolean;
};

/**
 * Что это: группа моделей одного провайдера для display model выпадающего списка.
 * Зачем нужно: JSX рендерит уже подготовленные группы и не знает деталей фильтрации по provider.
 */
export type ModelProviderGroup = {
  /** Технический provider из ModelOption, нужен как stable key. */
  provider: NonNullable<ModelOption['provider']>;
  /** Человекочитаемый заголовок группы. */
  label: string;
  /** Отфильтрованные модели конкретного провайдера. */
  options: ModelOption[];
};
