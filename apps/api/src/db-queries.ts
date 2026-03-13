import { prisma } from '@gold-monitor/db';
import type { RangeType, ResolutionType } from '@gold-monitor/shared';
import { rangeToResolution, rangeToDateRange } from '@gold-monitor/shared';

export interface DerivedRow {
  id: bigint;
  resolution: string;
  bucket_ts_utc: Date;
  gold_999_rub_g: number;
  gold_585_rub_g: number;
  usd_rub: number;
  gold_is_stale: boolean;
  usd_is_stale: boolean;
  row_status: string;
  created_at_utc: Date;
}

function toNumber(val: unknown): number {
  if (typeof val === 'number') return val;
  return parseFloat(String(val));
}

function mapRow(row: {
  id: bigint;
  resolution: string;
  bucket_ts_utc: Date;
  gold_999_rub_g: object;
  gold_585_rub_g: object;
  usd_rub: object;
  gold_is_stale: boolean;
  usd_is_stale: boolean;
  row_status: string;
  created_at_utc: Date;
}): DerivedRow {
  return {
    id: row.id,
    resolution: row.resolution,
    bucket_ts_utc: row.bucket_ts_utc,
    gold_999_rub_g: toNumber(row.gold_999_rub_g),
    gold_585_rub_g: toNumber(row.gold_585_rub_g),
    usd_rub: toNumber(row.usd_rub),
    gold_is_stale: row.gold_is_stale,
    usd_is_stale: row.usd_is_stale,
    row_status: row.row_status,
    created_at_utc: row.created_at_utc,
  };
}

export async function getLatestDerivedRow(): Promise<DerivedRow | null> {
  const row = await prisma.derived_quotes.findFirst({
    where: { row_status: 'valid' },
    orderBy: { bucket_ts_utc: 'desc' },
  });
  if (!row) return null;
  return mapRow(row);
}

export async function getSeriesForRange(
  range: RangeType,
): Promise<DerivedRow[]> {
  const resolution: ResolutionType = rangeToResolution(range);
  const { from } = rangeToDateRange(range);

  // First try the ideal resolution for this range
  const rows = await prisma.derived_quotes.findMany({
    where: {
      resolution,
      row_status: 'valid',
      bucket_ts_utc: { gte: from },
    },
    orderBy: { bucket_ts_utc: 'asc' },
  });

  // If too few data points, fetch all resolutions to fill gaps
  if (rows.length < 10) {
    const allRows = await prisma.derived_quotes.findMany({
      where: {
        row_status: 'valid',
        bucket_ts_utc: { gte: from },
      },
      orderBy: { bucket_ts_utc: 'asc' },
    });
    return allRows.map(mapRow);
  }

  return rows.map(mapRow);
}

export async function getTableRows(
  range: RangeType,
  page: number,
  pageSize: number,
): Promise<{ rows: DerivedRow[]; totalRows: number; resolution: ResolutionType }> {
  const resolution: ResolutionType = rangeToResolution(range);
  const { from } = rangeToDateRange(range);
  const skip = (page - 1) * pageSize;

  // Check if ideal resolution has enough data
  const idealCount = await prisma.derived_quotes.count({
    where: {
      resolution,
      row_status: 'valid',
      bucket_ts_utc: { gte: from },
    },
  });

  const useResolutionFilter = idealCount >= 10;
  const whereClause = {
    ...(useResolutionFilter ? { resolution } : {}),
    row_status: 'valid' as const,
    bucket_ts_utc: { gte: from },
  };

  const [rows, totalRows] = await Promise.all([
    prisma.derived_quotes.findMany({
      where: whereClause,
      orderBy: { bucket_ts_utc: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.derived_quotes.count({
      where: whereClause,
    }),
  ]);

  return { rows: rows.map(mapRow), totalRows, resolution };
}

export async function getLastSuccessfulFetch(): Promise<Date | null> {
  const row = await prisma.raw_quotes.findFirst({
    where: { is_valid: true },
    orderBy: { request_ts_utc: 'desc' },
  });
  return row ? row.request_ts_utc : null;
}

export async function getLastInstrumentStatus(instrument: string): Promise<string> {
  const row = await prisma.raw_quotes.findFirst({
    where: { instrument },
    orderBy: { request_ts_utc: 'desc' },
  });
  if (!row) return 'unknown';
  return row.is_valid ? 'valid' : 'invalid';
}
