import type {
  DashboardResponse,
  HistoryResponse,
  TableResponse,
  LatestQuote,
  SourceStatus,
  AlertRule,
  RangeType,
} from '@gold-monitor/shared';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export async function fetchLatest(): Promise<LatestQuote> {
  return apiFetch<LatestQuote>('/api/quotes/latest');
}

export async function fetchDashboard(range: RangeType): Promise<DashboardResponse> {
  return apiFetch<DashboardResponse>(`/api/dashboard?range=${range}`);
}

export async function fetchHistory(range: RangeType): Promise<HistoryResponse> {
  return apiFetch<HistoryResponse>(`/api/quotes/history?range=${range}`);
}

export async function fetchTable(
  range: RangeType,
  page = 1,
  pageSize = 100,
): Promise<TableResponse> {
  return apiFetch<TableResponse>(
    `/api/table?range=${range}&page=${page}&pageSize=${pageSize}`,
  );
}

export async function fetchSourceStatus(): Promise<SourceStatus> {
  return apiFetch<SourceStatus>('/api/source/status');
}

export async function fetchAlertRules(): Promise<AlertRule[]> {
  return apiFetch<AlertRule[]>('/api/alerts/rules');
}
