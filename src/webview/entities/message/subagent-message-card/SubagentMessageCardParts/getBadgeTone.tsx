export function getBadgeTone(status: 'running' | 'success' | 'error') {
  if (status === 'error') {
    return 'danger' as const;
  }
  if (status === 'success') {
    return 'success' as const;
  }
  return 'accent' as const;
}
