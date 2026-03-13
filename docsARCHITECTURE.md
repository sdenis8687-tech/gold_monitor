# Architecture

## 1. Общая схема
Система состоит из 4 сервисов:
- `web`
- `api`
- `worker`
- `postgres`

## 2. Ответственность сервисов

### `apps/web`
Отвечает за:
- рендер dashboard;
- получение данных только из `apps/api`;
- отображение KPI;
- отображение двух графиков;
- отображение таблицы;
- обновление latest snapshot.

### `apps/api`
Отвечает за:
- REST API для frontend;
- чтение данных из PostgreSQL;
- выдачу latest/history/table;
- выдачу статуса source freshness;
- CRUD для alert rules.

### `apps/worker`
Отвечает за:
- опрос MOEX ISS каждые 5 минут;
- bootstrap backfill;
- валидацию source data;
- запись raw quotes;
- расчет derived quotes;
- запуск alert logic;
- логирование ошибок.

### `postgres`
Хранит:
- сырые ответы источника;
- derived series;
- alert rules;
- alert events.

## 3. Поток данных
1. Worker ходит в MOEX ISS.
2. Worker сохраняет raw ответ в `raw_quotes`.
3. Worker валидирует цену и timestamp.
4. Worker рассчитывает:
   - `gold_999_rub_g`
   - `gold_585_rub_g`
   - `usd_rub`
5. Worker записывает derived row в `derived_quotes`.
6. API читает данные из `derived_quotes`.
7. Web получает данные только через API.

## 4. Source resolutions
Использовать 2 resolution слоя:
- `intraday`
- `daily`

### `intraday`
Используется для:
- `1D`
- `7D`

### `daily`
Используется для:
- `30D`
- `90D`
- `1Y`

## 5. Bootstrap backfill
На первом запуске worker обязан:
1. получить daily history за 365 календарных дней для обоих инструментов;
2. получить intraday history за 7 календарных дней для обоих инструментов;
3. преобразовать эти данные в `derived_quotes`;
4. после backfill перейти в polling режим.

## 6. Dedupe rules
- raw запрос сохраняется каждый раз;
- derived row сохраняется только один раз на bucket времени и resolution;
- уникальность derived row определяется парой:
  - `resolution`
  - `bucket_ts_utc`

## 7. Freshness
- рабочий polling interval: 5 минут;
- stale threshold: 25 минут;
- stale точка разрешена к показу в UI;
- stale точка помечается визуально;
- битая точка в UI не публикуется.

## 8. UI state rules
- если latest row есть и не stale → `ready`
- если latest row есть и stale → `stale`
- если history пуста → `empty`
- если API error → `error`

## 9. Repo layout
Использовать такой layout:
- `apps/web`
- `apps/api`
- `apps/worker`
- `packages/shared`
- `packages/db`
- `tests/fixtures/moex`
- `docs`

## 10. Packages

### `packages/shared`
Хранит:
- TS types;
- DTO;
- zod schemas;
- calculators;
- normalization helpers;
- validation helpers;
- chart/table mappers.

### `packages/db`
Хранит:
- Prisma schema;
- Prisma client;
- DB helper functions.

## 11. Docker services
В `docker-compose.yml` поднять:
- `web`
- `api`
- `worker`
- `postgres`

Локальный reverse proxy не обязателен для MVP.

## 12. Environment
Обязательные env-переменные:
- `NODE_ENV`
- `DATABASE_URL`
- `MOEX_BASE_URL`
- `POLL_INTERVAL_MINUTES`
- `STALE_THRESHOLD_MINUTES`
- `BACKFILL_DAILY_DAYS`
- `BACKFILL_INTRADAY_DAYS`
- `APP_TIMEZONE`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `ALERT_FROM_EMAIL`
- `ALERT_TO_EMAILS`

## 13. Testing strategy
Нужно создать:
- unit tests;
- integration tests на fixtures;
- Playwright smoke tests;
- live smoke check against MOEX during final verification.

## 14. Final artifact
После завершения агент обязан сформировать:
- `docs/VERIFICATION_REPORT.md`