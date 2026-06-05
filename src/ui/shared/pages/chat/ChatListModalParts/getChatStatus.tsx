import { type AgentLanguage, type ChatSummary } from '../../../types';

export function getChatStatus(chat: ChatSummary, language: AgentLanguage): { label: string; className: string } {
  if (chat.activity === 'waitingForApproval') {
    return { label: language === 'ru' ? 'Ждёт подтверждение' : 'Approval needed', className: 'chatStatusApproval' };
  }
  if (chat.activity === 'runningTool') {
    return { label: language === 'ru' ? 'Инструмент' : 'Tool', className: 'chatStatusTool' };
  }
  if (chat.activity === 'stopping') {
    return { label: language === 'ru' ? 'Останавливается' : 'Stopping', className: 'chatStatusStopping' };
  }
  if (chat.activity === 'answering') {
    return { label: language === 'ru' ? 'Отвечает' : 'Answering', className: 'chatStatusBusy' };
  }

  return { label: language === 'ru' ? 'Работает' : 'Running', className: 'chatStatusBusy' };
}
