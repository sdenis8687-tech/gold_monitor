'use client';

interface KpiCardProps {
  label: string;
  value: string | null;
  loading?: boolean;
  highlight?: 'gold' | 'usd';
}

export function KpiCard({ label, value, loading = false, highlight }: KpiCardProps) {
  const accentClass =
    highlight === 'gold'
      ? 'text-[#f5c842]'
      : highlight === 'usd'
        ? 'text-[#4fa8e8]'
        : 'text-slate-100';

  return (
    <div className="rounded-xl bg-[#1a1d27] border border-[#2a2d3a] p-5 flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</span>
      {loading ? (
        <div className="h-8 w-32 rounded bg-[#2a2d3a] animate-pulse mt-1" />
      ) : (
        <span className={`text-2xl font-bold tabular-nums ${accentClass}`}>
          {value ?? '—'}
        </span>
      )}
    </div>
  );
}
