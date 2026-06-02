/**
 * Что это: строит стабильную строковую подпись состава групп сообщений.
 * Зачем нужно: MessageList обновляет анимационное состояние только при изменении состава истории,
 * а не при каждом локальном render после setState.
 * Какую проблему решает: защищает webview от бесконечного React update loop, из-за которого чаты не отображаются.
 */
export function getMessageGroupIdsSignature({ groupIds }: { groupIds: string[] }): string {
  return groupIds.join('\u001f');
}
