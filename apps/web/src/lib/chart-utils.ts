export function formatMoscowTime(isoString: string): string {
  return new Date(isoString).toLocaleString('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatMoscowDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function isStaleDate(isoString: string | null, thresholdMinutes = 25): boolean {
  if (!isoString) return true;
  return Date.now() - new Date(isoString).getTime() > thresholdMinutes * 60 * 1000;
}
