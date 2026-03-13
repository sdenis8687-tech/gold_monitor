'use client';

import type { TableRow } from '@gold-monitor/shared';

interface DataTableProps {
  rows: TableRow[];
  totalRows: number;
  page: number;
  pageSize: number;
  loading?: boolean;
  groupByDay?: boolean;
  onPageChange: (page: number) => void;
}

function toMoscowDateKey(ts: string): string {
  return new Date(ts).toLocaleDateString('ru-RU', {
    timeZone: 'Europe/Moscow',
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
}

function formatMoscowDate(ts: string): string {
  return new Date(ts).toLocaleDateString('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function formatMoscowDateTime(ts: string): string {
  const d = new Date(ts);
  const date = d.toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' });
  return `${date} ${time}`;
}

function dedupeByDay(rows: TableRow[]): TableRow[] {
  const seen = new Set<string>();
  const result: TableRow[] = [];
  for (const row of rows) {
    const key = toMoscowDateKey(row.ts);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(row);
    }
  }
  return result;
}

export function DataTable({
  rows,
  totalRows,
  page,
  pageSize,
  loading = false,
  groupByDay = false,
  onPageChange,
}: DataTableProps) {
  const dedupedRows = groupByDay ? dedupeByDay(rows) : rows;
  const totalPages = groupByDay
    ? Math.ceil(dedupedRows.length / pageSize)
    : Math.ceil(totalRows / pageSize);

  if (loading) {
    return (
      <div className="rounded-xl bg-[#1a1d27] border border-[#2a2d3a] overflow-hidden">
        <div className="p-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 rounded bg-[#2a2d3a] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (dedupedRows.length === 0) {
    return (
      <div className="rounded-xl bg-[#1a1d27] border border-[#2a2d3a] p-8 text-center text-slate-500">
        Нет данных для отображения
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[#1a1d27] border border-[#2a2d3a] overflow-hidden">
      <table className="w-full text-sm table-fixed">
        <thead>
          <tr className="border-b border-[#2a2d3a] bg-[#0f1117]">
            <th style={{ width: '25%' }} className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              {groupByDay ? 'Дата (МСК)' : 'Дата/время (МСК)'}
            </th>
            <th style={{ width: '25%' }} className="px-3 py-2 text-right text-xs font-medium text-[#f5c842] uppercase tracking-wider">
              Золото 585, ₽/г
            </th>
            <th style={{ width: '25%' }} className="px-3 py-2 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
              Золото 999, ₽/г
            </th>
            <th style={{ width: '25%' }} className="px-3 py-2 text-right text-xs font-medium text-[#4fa8e8] uppercase tracking-wider">
              USD/RUB
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1e2130]">
          {dedupedRows.map((row, i) => (
            <tr key={i} className="hover:bg-[#1e2130] transition-colors">
              <td className="px-3 py-2 text-slate-400 tabular-nums text-xs">
                {groupByDay ? formatMoscowDate(row.ts) : formatMoscowDateTime(row.ts)}
              </td>
              <td className="px-3 py-2 text-right text-[#f5c842] font-medium tabular-nums text-xs">
                {row.gold_585_rub_g.toLocaleString('ru-RU', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td className="px-3 py-2 text-right text-slate-300 tabular-nums text-xs">
                {row.gold_999_rub_g.toLocaleString('ru-RU', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td className="px-3 py-2 text-right text-[#4fa8e8] tabular-nums text-xs">
                {row.usd_rub.toLocaleString('ru-RU', {
                  minimumFractionDigits: 4,
                  maximumFractionDigits: 4,
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-[#2a2d3a]">
          <span className="text-xs text-slate-500">
            Страница {page} из {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1 rounded-md text-xs bg-[#2a2d3a] text-slate-300 disabled:opacity-40 hover:bg-[#3a3d4a] transition-colors"
            >
              ← Назад
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1 rounded-md text-xs bg-[#2a2d3a] text-slate-300 disabled:opacity-40 hover:bg-[#3a3d4a] transition-colors"
            >
              Вперёд →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
