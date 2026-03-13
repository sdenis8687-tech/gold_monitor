'use client';

interface StaleBadgeProps {
  isStale: boolean;
  lastUpdateTime: string | null;
}

export function StaleBadge({ isStale, lastUpdateTime }: StaleBadgeProps) {
  if (!isStale) return null;

  const timeStr = lastUpdateTime
    ? new Date(lastUpdateTime).toLocaleString('ru-RU', {
        timeZone: 'Europe/Moscow',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  return (
    <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-amber-400 text-sm">
      <span className="text-base">⚠</span>
      <span>Данные устарели — последнее обновление в {timeStr} МСК</span>
    </div>
  );
}
