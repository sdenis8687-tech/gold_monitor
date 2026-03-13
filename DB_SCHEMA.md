
### `docs/DB_SCHEMA.md`
```md
# DB Schema

## 1. Общие правила
- БД: PostgreSQL
- ORM: Prisma
- Все timestamps: UTC
- Денежные значения хранить в numeric

## 2. Table: raw_quotes
Назначение:
- хранить каждый сырой ответ источника

Поля:
- `id` bigint primary key
- `source` text not null default `MOEX_ISS`
- `instrument` text not null
- `endpoint_kind` text not null
- `resolution_hint` text not null
- `request_ts_utc` timestamptz not null
- `source_ts_utc` timestamptz null
- `http_status` integer not null
- `is_valid` boolean not null
- `validation_status` text not null
- `payload_json` jsonb not null
- `payload_hash` text not null

Индексы:
- index on `(instrument, request_ts_utc desc)`
- index on `(instrument, endpoint_kind, request_ts_utc desc)`
- unique on `(instrument, endpoint_kind, payload_hash)`

## 3. Table: derived_quotes
Назначение:
- хранить готовые данные для UI и alerts

Поля:
- `id` bigint primary key
- `resolution` text not null
- `bucket_ts_utc` timestamptz not null
- `gold_source_ts_utc` timestamptz null
- `usd_source_ts_utc` timestamptz null
- `gold_999_rub_g` numeric(18,6) not null
- `gold_585_rub_g` numeric(18,2) not null
- `usd_rub` numeric(18,6) not null
- `gold_is_stale` boolean not null default false
- `usd_is_stale` boolean not null default false
- `row_status` text not null default `valid`
- `raw_gold_id` bigint null
- `raw_usd_id` bigint null
- `created_at_utc` timestamptz not null default now()

Индексы:
- unique on `(resolution, bucket_ts_utc)`
- index on `(bucket_ts_utc desc)`
- index on `(resolution, bucket_ts_utc desc)`

## 4. Table: alert_rules
Назначение:
- хранить правила email-уведомлений

Поля:
- `id` bigint primary key
- `metric` text not null
- `rule_type` text not null
- `threshold_value` numeric(18,6) not null
- `cooldown_minutes` integer not null
- `recipient_emails` text[] not null
- `is_active` boolean not null default true
- `created_at_utc` timestamptz not null default now()
- `updated_at_utc` timestamptz not null default now()

## 5. Table: alert_events
Назначение:
- хранить факты срабатывания правил

Поля:
- `id` bigint primary key
- `rule_id` bigint not null
- `metric` text not null
- `rule_type` text not null
- `metric_value` numeric(18,6) not null
- `delta_abs` numeric(18,6) null
- `delta_pct` numeric(18,6) null
- `triggered_at_utc` timestamptz not null
- `delivery_status` text not null
- `delivery_error` text null

Индексы:
- index on `(rule_id, triggered_at_utc desc)`
- index on `(metric, triggered_at_utc desc)`

## 6. Seed rules
Нужно создать seed для alert rules:
- `gold_585_rub_g`, `ABS_DELTA`, `50`, `30`
- `gold_585_rub_g`, `PCT_DELTA`, `0.5`, `30`
- `gold_585_rub_g`, `DAILY_DIGEST`, `0`, `1440`

## 7. Resolution values
Допустимые значения `resolution`:
- `intraday`
- `daily`

## 8. endpoint_kind values
Допустимые значения:
- `latest`
- `candles_intraday`
- `candles_daily`