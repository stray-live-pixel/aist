import type { Chat } from '../../../shared/types';

/**
 * Что это: входные данные строки активности агента.
 * Зачем нужно: компонент может жить отдельно от MessageList, а тип явно фиксирует,
 * что detail — необязательная замена стандартного текста статуса.
 */
export type AgentActivityStatusProps = {
  activity: Chat['activity'];
  detail?: string;
  modelRequest?: Chat['modelRequest'];
};
