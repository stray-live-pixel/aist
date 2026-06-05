import { chatActions } from './agentActions/chatActions';
import { isolationActions } from './agentActions/isolationActions';
import { promptActions } from './agentActions/promptActions';
import { settingsActions } from './agentActions/settingsActions';
import { workflowActions } from './agentActions/workflowActions';

/**
 * Что это: command facade поверх событийного IPC webview -> extension.
 * Зачем нужно: компоненты используют один привычный API, а реализация разложена по продуктовым сценариям.
 * Какую проблему решает: новые действия агента добавляются в свою группу, не раздувая общий файл.
 */
export const agentActions = {
  ...chatActions,
  ...isolationActions,
  ...settingsActions,
  ...promptActions,
  ...workflowActions
};
