export function getStatusTone(status: string): 'neutral' | 'accent' | 'success' | 'warning' | 'danger' {
  if (status === 'finished') {
    return 'success';
  }
  if (status === 'running') {
    return 'accent';
  }
  if (status === 'stopped') {
    return 'warning';
  }
  if (status === 'error') {
    return 'danger';
  }
  return 'neutral';
}
