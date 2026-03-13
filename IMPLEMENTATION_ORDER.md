# Implementation Order

## Этап 1. Подготовить документы
Создать и заполнить:
- `AGENTS.md`
- `docs/PRD.md`
- `docs/SOURCE_DECISION.md`
- `docs/LEGACY_FLOW_ANALYSIS.md`
- `docs/MOEX_SOURCE_SPEC.md`
- `docs/MOEX_FIELD_MAPPING.md`
- `docs/ARCHITECTURE.md`
- `docs/DB_SCHEMA.md`
- `docs/API_SPEC.md`
- `docs/SELF_CHECK.md`
- `docs/VERIFICATION_REPORT_TEMPLATE.md`

Результат:
- репозиторий содержит полный набор документов до кода.

## Этап 2. Положить входной legacy файл
Добавить:
- `docs/input/n8n-workflow.json`

Результат:
- legacy workflow доступен в репозитории.

## Этап 3. Зафиксировать mapping MOEX
Сделать live-запросы к:
- latest `GLDRUB_TOM`
- latest `USD000UTSTOM`
- candles `GLDRUB_TOM`
- candles `USD000UTSTOM`

Заполнить:
- `docs/MOEX_FIELD_MAPPING.md`

Сохранить fixtures:
- `tests/fixtures/moex/latest-gldrub.json`
- `tests/fixtures/moex/latest-usd.json`
- `tests/fixtures/moex/candles-intraday-gldrub.json`
- `tests/fixtures/moex/candles-intraday-usd.json`
- `tests/fixtures/moex/candles-daily-gldrub.json`
- `tests/fixtures/moex/candles-daily-usd.json`

Результат:
- field mapping зафиксирован;
- fixtures лежат в репозитории.

## Этап 4. Собрать монорепозиторий
Создать:
- `apps/web`
- `apps/api`
- `apps/worker`
- `packages/shared`
- `packages/db`

Добавить:
- workspace config;
- tsconfig;
- eslint;
- prettier;
- docker-compose;
- `.env.example`;
- `README.md`.

Результат:
- монорепозиторий собирается.

## Этап 5. Реализовать БД
Создать Prisma schema и migrations для:
- `raw_quotes`
- `derived_quotes`
- `alert_rules`
- `alert_events`

Результат:
- миграции применяются без ошибок.

## Этап 6. Реализовать MOEX client
Сделать:
- `MoexIssClient`
- parsing helpers
- validation helpers
- mapper from raw JSON to typed DTO

Результат:
- client умеет получать latest и candles;
- client покрыт unit tests на fixtures.

## Этап 7. Реализовать bootstrap backfill
Worker при первом старте обязан:
- загрузить 365 дней daily history;
- загрузить 7 дней intraday history;
- записать raw данные;
- вычислить derived rows;
- завершить bootstrap.

Результат:
- диапазоны `30D`, `90D`, `1Y` работают сразу;
- диапазоны `1D`, `7D` имеют готовые intraday данные.

## Этап 8. Реализовать polling worker
Worker обязан:
- работать каждые 5 минут;
- получать latest для обоих инструментов;
- валидировать ответ;
- писать raw row;
- писать derived row;
- вычислять stale status;
- запускать alert engine.

Результат:
- live данные попадают в БД.

## Этап 9. Реализовать API
Сделать endpoints из `docs/API_SPEC.md`.

Результат:
- frontend получает latest/history/table/alerts из API.

## Этап 10. Реализовать UI
Сделать:
- premium dark dashboard;
- KPI;
- 2 графика;
- range switcher;
- normalization toggle;
- кнопку `Таблица`;
- таблицу;
- stale badge;
- loading/empty/error states.

Результат:
- главная страница полностью работоспособна.

## Этап 11. Реализовать email alerts
Сделать:
- ABS_DELTA
- PCT_DELTA
- DAILY_DIGEST
- cooldown
- логирование alert events

Результат:
- алерты работают без спама.

## Этап 12. Реализовать автопроверку
Добавить:
- unit tests;
- integration tests;
- Playwright smoke test.

Результат:
- продукт можно проверить без ручной догадки.

## Этап 13. Провести self-check
Выполнить все проверки из `docs/SELF_CHECK.md`.

Результат:
- подтверждена работоспособность.

## Этап 14. Сформировать verification report
Создать:
- `docs/VERIFICATION_REPORT.md`

Результат:
- задача считается завершенной.