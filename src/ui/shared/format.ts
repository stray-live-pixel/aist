export function formatRelativeTime(timestamp: number | undefined): string {
  if (!timestamp) {
    return '';
  }

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.max(0, Math.round(diffMs / 60_000));
  if (diffMinutes < 1) {
    return 'now';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h`;
  }

  return new Date(timestamp).toLocaleDateString();
}

export function previewText(value: unknown, maxLength = 360): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  if (!text) {
    return '';
  }

  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}
