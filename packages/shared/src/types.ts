export type RangeType = '1D' | '7D' | '30D' | '90D' | '6M' | '1Y';
export type ResolutionType = 'intraday' | 'daily';

export interface LatestQuote {
  gold_585_rub_g: number;
  gold_999_rub_g: number;
  usd_rub: number;
  bucket_ts_utc: string;
  last_successful_fetch_utc: string | null;
  is_stale: boolean;
  source: string;
}

export interface ChartPoint {
  ts: string;
  value: number;
}

export interface TableRow {
  ts: string;
  gold_585_rub_g: number;
  gold_999_rub_g: number;
  usd_rub: number;
}

export interface DashboardResponse {
  latest: LatestQuote;
  series: {
    gold585: ChartPoint[];
    usdRub: ChartPoint[];
  };
  tablePreview: TableRow[];
  meta: {
    range: RangeType;
    resolution: ResolutionType;
    table_supported: boolean;
    source: string;
  };
}

export interface HistoryResponse {
  range: RangeType;
  resolution: ResolutionType;
  series: {
    gold585: ChartPoint[];
    usdRub: ChartPoint[];
  };
  rows: TableRow[];
  meta: {
    source: string;
  };
}

export interface TableResponse {
  range: RangeType;
  resolution: ResolutionType;
  page: number;
  pageSize: number;
  totalRows: number;
  rows: TableRow[];
}

export interface AlertRule {
  id: string;
  metric: string;
  rule_type: string;
  threshold_value: number;
  cooldown_minutes: number;
  recipient_emails: string[];
  is_active: boolean;
}

export interface AlertEvent {
  id: string;
  rule_id: string;
  metric: string;
  rule_type: string;
  metric_value: number;
  delta_abs: number | null;
  delta_pct: number | null;
  triggered_at_utc: string;
  delivery_status: string;
  delivery_error: string | null;
}

export interface SourceStatus {
  source: string;
  poll_interval_minutes: number;
  stale_threshold_minutes: number;
  last_successful_fetch_utc: string | null;
  is_stale: boolean;
  last_gold_status: string;
  last_usd_status: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

export type ErrorCode =
  | 'SOURCE_DATA_UNAVAILABLE'
  | 'SOURCE_RESPONSE_INVALID'
  | 'SOURCE_TIMEOUT'
  | 'RANGE_NOT_SUPPORTED'
  | 'BAD_REQUEST'
  | 'INTERNAL_ERROR';

export interface MoexLatestData {
  secid: string;
  boardid: string;
  last: number | null;
  updatetime: string | null;
  tradingstatus: string | null;
}

export interface MoexCandle {
  begin: string;
  end: string;
  open: number;
  close: number;
  high: number;
  low: number;
  value: number;
  volume: number;
}
