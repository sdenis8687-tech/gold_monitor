'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DashboardResponse, LatestQuote, RangeType, TableResponse } from '@gold-monitor/shared';
import { KpiCard } from '@/components/KpiCard';
import { Charts } from '@/components/Charts';
import { RangeSelector } from '@/components/RangeSelector';
import { DataTable } from '@/components/DataTable';
import { StaleBadge } from '@/components/StaleBadge';
import { fetchDashboard, fetchLatest, fetchTable } from '@/lib/api-client';
import { formatMoscowTime } from '@/lib/chart-utils';

type ViewMode = 'charts' | 'table';
type PageState = 'loading' | 'ready' | 'stale' | 'empty' | 'error';

export default function DashboardPage() {
  const [range, setRange] = useState<RangeType>('30D');
  const [viewMode, setViewMode] = useState<ViewMode>('charts');

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [tableData, setTableData] = useState<TableResponse | null>(null);
  const [tablePage, setTablePage] = useState(1);

  const [pageState, setPageState] = useState<PageState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const latestTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const seriesTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rangeRef = useRef<RangeType>('30D');

  const loadDashboard = useCallback(async (r: RangeType) => {
    setPageState('loading');
    setErrorMessage(null);
    try {
      const data = await fetchDashboard(r);
      setDashboard(data);
      if (data.series.gold585.length === 0) {
        setPageState('empty');
      } else if (data.latest.is_stale) {
        setPageState('stale');
      } else {
        setPageState('ready');
      }
    } catch (err) {
      setPageState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Ошибка загрузки данных');
    }
  }, []);

  const loadTable = useCallback(async (r: RangeType, page: number) => {
    try {
      const data = await fetchTable(r, page, 100);
      setTableData(data);
    } catch {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    loadDashboard(range);
  }, [range, loadDashboard]);

  useEffect(() => {
    if (viewMode === 'table') {
      loadTable(range, tablePage);
    }
  }, [viewMode, range, tablePage, loadTable]);

  useEffect(() => {
    const refreshLatest = async () => {
      try {
        const latest: LatestQuote = await fetchLatest();
        setDashboard((prev) => prev ? { ...prev, latest } : prev);
        if (latest.is_stale) setPageState('stale');
        else setPageState((s) => s === 'stale' ? 'ready' : s);
      } catch {
        // Silent fail
      }
    };

    const refreshSeries = async () => {
      try {
        const data = await fetchDashboard(rangeRef.current);
        setDashboard(data);
        if (data.series.gold585.length === 0) {
          setPageState('empty');
        } else if (data.latest.is_stale) {
          setPageState('stale');
        } else {
          setPageState((s) => s === 'loading' ? s : 'ready');
        }
      } catch {
        // Silent fail
      }
    };

    latestTimerRef.current = setInterval(refreshLatest, 60_000);
    seriesTimerRef.current = setInterval(refreshSeries, 5 * 60_000);
    return () => {
      if (latestTimerRef.current) clearInterval(latestTimerRef.current);
      if (seriesTimerRef.current) clearInterval(seriesTimerRef.current);
    };
  }, []);

  const handleRangeChange = (r: RangeType) => { rangeRef.current = r; setRange(r); setTablePage(1); };

  const latest = dashboard?.latest ?? null;

  const fmt = (val: number | null | undefined, dec = 2): string | null => {
    if (val == null) return null;
    return val.toLocaleString('ru-RU', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  };

  return (
    <main className="min-h-screen px-4 py-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Gold Monitor</h1>
          <p className="text-sm text-slate-500 mt-0.5">Источник: MOEX ISS · Обновление каждые 5 минут</p>
        </div>
        {latest?.is_stale && (
          <StaleBadge isStale={latest.is_stale} lastUpdateTime={latest.last_successful_fetch_utc} />
        )}
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Золото 585, ₽/г" value={fmt(latest?.gold_585_rub_g)} loading={pageState === 'loading'} highlight="gold" />
        <KpiCard label="Золото 999, ₽/г" value={fmt(latest?.gold_999_rub_g)} loading={pageState === 'loading'} />
        <KpiCard label="USD/RUB" value={fmt(latest?.usd_rub, 4)} loading={pageState === 'loading'} highlight="usd" />
        <KpiCard
          label="Последнее обновление"
          value={latest?.bucket_ts_utc ? formatMoscowTime(latest.bucket_ts_utc) : null}
          loading={pageState === 'loading'}
        />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <RangeSelector selected={range} onChange={handleRangeChange} />
        <div className="ml-auto">
          <button
            onClick={() => {
              const next: ViewMode = viewMode === 'charts' ? 'table' : 'charts';
              setViewMode(next);
              if (next === 'table') loadTable(range, tablePage);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
              viewMode === 'table'
                ? 'bg-[#f5c842] text-[#0f1117] border-[#f5c842]'
                : 'bg-[#1a1d27] text-slate-300 border-[#2a2d3a] hover:border-[#f5c842] hover:text-[#f5c842]'
            }`}
            data-testid="table-toggle"
          >
            Таблица
          </button>
        </div>
      </div>

      {/* Error */}
      {pageState === 'error' && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-6 text-center">
          <p className="text-red-400 font-medium">Ошибка загрузки данных</p>
          <p className="text-red-400/60 text-sm mt-1">{errorMessage}</p>
          <button onClick={() => loadDashboard(range)} className="mt-3 px-4 py-2 rounded-lg bg-red-500/20 text-red-300 text-sm hover:bg-red-500/30 transition-colors">
            Повторить
          </button>
        </div>
      )}

      {/* Empty */}
      {pageState === 'empty' && (
        <div className="rounded-xl bg-[#1a1d27] border border-[#2a2d3a] p-12 text-center">
          <p className="text-slate-400 text-lg">Нет данных за выбранный период</p>
          <p className="text-slate-600 text-sm mt-2">Данные будут доступны после первого запуска worker</p>
        </div>
      )}

      {/* Charts */}
      {pageState !== 'error' && viewMode === 'charts' && (
        <Charts
          gold585={dashboard?.series.gold585 ?? []}
          usdRub={dashboard?.series.usdRub ?? []}
          loading={pageState === 'loading'}
        />
      )}

      {/* Table */}
      {pageState !== 'error' && viewMode === 'table' && (
        <DataTable
          rows={tableData?.rows ?? dashboard?.tablePreview ?? []}
          totalRows={tableData?.totalRows ?? (dashboard?.tablePreview?.length ?? 0)}
          page={tablePage}
          pageSize={100}
          loading={pageState === 'loading' && !tableData}
          groupByDay={range !== '1D' && range !== '7D'}
          onPageChange={handleTablePageChange}
        />
      )}

      <div className="mt-8 text-center text-xs text-slate-600">
        Gold Monitor · Источник данных: Московская биржа (MOEX ISS)
      </div>
    </main>
  );

  function handleTablePageChange(p: number) {
    setTablePage(p);
  }
}
