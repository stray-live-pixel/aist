export function getStatusText(status: 'running' | 'success' | 'error'): string {
  if (status === 'running') {
    return 'В работе';
  }
  if (status === 'error') {
    return 'Ошибка';
  }
  return 'Готово';
}
