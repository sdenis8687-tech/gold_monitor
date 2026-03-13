# API

## 1. Назначение
Этот файл является единственным API-контрактом проекта.

Он определяет:
- внешний источник данных;
- правила получения и валидации сырых данных;
- правила расчета производных значений;
- внутренние REST endpoints приложения;
- форматы request/response;
- error contract;
- правила polling, backfill и freshness.

Этот файл заменяет:
- `docs/API_SPEC.md`
- `docs/MOEX_SOURCE_SPEC.md`
- `docs/MOEX_FIELD_MAPPING.md`

---

## 2. Источник данных

### 2.1. Source of truth
Единственный production source:
- `MOEX ISS`

### 2.2. Base URL
- `https://iss.moex.com`

### 2.3. Инструменты
Использовать только:
- `GLDRUB_TOM`
- `USD000UTSTOM`

### 2.4. Market path
Использовать только:
- `engine = currency`
- `market = selt`
- `board = CETS`

### 2.5. Scope
Источник используется только для внутреннего мониторинга заказчика.
Frontend не обращается в MOEX напрямую.
Все обращения к MOEX делает только `worker`.

---

## 3. Внешний API MOEX

## 3.1. Latest quote endpoints
Для текущей цены использовать только:

### Gold 999
`GET /iss/engines/currency/markets/selt/boards/CETS/securities/GLDRUB_TOM.json?iss.only=marketdata,securities&iss.meta=off`

### USD/RUB
`GET /iss/engines/currency/markets/selt/boards/CETS/securities/USD000UTSTOM.json?iss.only=marketdata,securities&iss.meta=off`

---

## 3.2. Candles endpoints
Для исторических данных использовать только:

### Gold 999
`GET /iss/engines/currency/markets/selt/boards/CETS/securities/GLDRUB_TOM/candles.json?iss.meta=off&from={from}&till={till}&interval={interval}`

### USD/RUB
`GET /iss/engines/currency/markets/selt/boards/CETS/securities/USD000UTSTOM/candles.json?iss.meta=off&from={from}&till={till}&interval={interval}`

### Fixed intervals
Использовать только:
- `interval=10` для `intraday`
- `interval=24` для `daily`

---

## 4. Правила чтения MOEX JSON

## 4.1. Общий принцип
MOEX JSON нужно читать не по позиции поля, а по `columns`.

Алгоритм:
1. взять block;
2. взять `columns`;
3. построить `columnIndexMap`;
4. взять первую строку из `data`;
5. доставать поля по имени через `columnIndexMap`.

Это обязательное правило для:
- `marketdata`
- `securities`
- `candles`

---

## 4.2. Latest quote mapping
Для latest endpoint использовать block:
- `marketdata`

Из `marketdata.columns` и `marketdata.data[0]` извлекать:

- `SECID`
- `BOARDID`
- `LAST`
- `UPDATETIME`
- `TRADINGSTATUS`

### Правила latest mapping
- `price = LAST`
- `instrument = SECID`
- `board = BOARDID`
- `trading_status = TRADINGSTATUS`
- `exchange_time_msk = UPDATETIME`

### Важное правило
Для freshness приложения используется не `UPDATETIME`, а время успешного запроса:
- `request_ts_utc = now() at fetch time`

Это исключает двусмысленность со временем биржи, часовым поясом и возможными пустыми полями вне активной сессии.

---

## 4.3. Candles mapping
Для candles endpoint использовать block:
- `candles`

Из `candles.columns` и `candles.data[*]` извлекать:

- `begin`
- `end`
- `open`
- `close`
- `high`
- `low`
- `value`
- `volume`

### Правила candles mapping
- использовать `close` как цену ряда;
- использовать `begin` как timestamp свечи;
- `end` использовать как вспомогательное поле;
- если `close <= 0`, свеча отклоняется.

---

## 5. Валидация source data

## 5.1. Latest response validation
Latest response считается валидным только если одновременно выполнено:

1. HTTP status = 200
2. JSON parse success
3. block `marketdata` существует
4. `marketdata.columns` существует
5. `marketdata.data` существует
6. `marketdata.data[0]` существует
7. `LAST` найден
8. `LAST` является числом
9. `LAST > 0`
10. `SECID` совпадает с ожидаемым инструментом
11. `BOARDID = CETS`

Если хотя бы одно правило нарушено:
- raw payload сохраняется;
- derived row не публикуется;
- статус = `rejected`.

---

## 5.2. Candle response validation
Candle response считается валидным только если одновременно выполнено:

1. HTTP status = 200
2. JSON parse success
3. block `candles` существует
4. `candles.columns` существует
5. `candles.data` существует
6. для каждой используемой строки:
   - `begin` существует
   - `close` существует
   - `close` является числом
   - `close > 0`

Невалидные свечи пропускаются и логируются.

---

## 5.3. Freshness
Приложение использует только внутреннее правило freshness:

- worker polling interval = `5 минут`
- stale threshold = `25 минут`

### Правило stale
Snapshot считается `stale`, если:
- `now_utc - last_successful_fetch_utc > 25 minutes`

---

## 6. Расчетные правила

## 6.1. Основные значения
Использовать только такие формулы:

- `gold_999_rub_g = last_price(GLDRUB_TOM)`
- `gold_585_rub_g = round(gold_999_rub_g * 585 / 999, 2)`
- `usd_rub = last_price(USD000UTSTOM)`

## 6.2. Нормализация для графиков
Нормализованные значения не хранятся в БД.
Они считаются на уровне API или frontend по ряду выбранного периода.

Формула:
- `normalized_value = round(current_value / first_visible_value * 100, 2)`

---

## 7. Resolution и диапазоны

## 7.1. Resolution mapping
Использовать только два resolution-слоя:
- `intraday`
- `daily`

## 7.2. Range mapping
Использовать только такую привязку:

- `1D` → `intraday`
- `7D` → `intraday`
- `30D` → `daily`
- `90D` → `daily`
- `1Y` → `daily`

---

## 8. Bootstrap и polling

## 8.1. Bootstrap backfill
При первом старте worker обязан выполнить backfill:

### daily backfill
- диапазон: `365 дней`
- источник: candles `interval=24`
- инструменты:
  - `GLDRUB_TOM`
  - `USD000UTSTOM`

### intraday backfill
- диапазон: `7 дней`
- источник: candles `interval=10`
- инструменты:
  - `GLDRUB_TOM`
  - `USD000UTSTOM`

### Правило записи
После чтения обоих инструментов worker должен собрать согласованные derived rows по timestamp.

---

## 8.2. Polling
После backfill worker переходит в постоянный режим:

- каждые `5 минут`
- получить latest quote для `GLDRUB_TOM`
- получить latest quote для `USD000UTSTOM`
- сохранить raw payload
- провалидировать оба ответа
- рассчитать derived row
- записать derived row
- запустить alert engine

---

## 9. Хранилище и serving layer

## 9.1. Serving rule
Frontend получает данные только из API приложения.

Запрещено:
- web → MOEX
- browser → MOEX
- charts → MOEX

Разрешено только:
- worker → MOEX
- api → PostgreSQL
- web → api

## 9.2. Raw vs derived
Хранить отдельно:
- `raw_quotes`
- `derived_quotes`

### raw_quotes
Хранит:
- каждый ответ MOEX;
- статус валидации;
- request timestamp;
- payload JSON.

### derived_quotes
Хранит:
- готовые данные для KPI;
- ряды для графиков;
- строки для таблицы;
- stale status.

---

## 10. Внутренний REST API приложения

## 10.1. Общие правила
- Все ответы JSON.
- Все timestamps возвращать в ISO 8601 UTC.
- Числа возвращать числами, не строками.
- Источник во всех ответах фиксированный:
  - `source = "MOEX ISS"`

---

## 10.2. GET /api/health
### Purpose
Проверка доступности API.

### Response 200
```json
{
  "status": "ok",
  "service": "gold-monitor-api",
  "time_utc": "2026-03-11T12:00:00.000Z"
}

10.3. GET /api/quotes/latest
Purpose

Вернуть последний валидный snapshot для KPI.

Response 200
{
  "gold_585_rub_g": 8234.12,
  "gold_999_rub_g": 14047.23,
  "usd_rub": 91.3456,
  "bucket_ts_utc": "2026-03-11T12:00:00.000Z",
  "last_successful_fetch_utc": "2026-03-11T12:00:00.000Z",
  "is_stale": false,
  "source": "MOEX ISS"
}
10.4. GET /api/dashboard?range=30D
Purpose

Вернуть все данные для первоначальной отрисовки страницы.

Allowed range

1D

7D

30D

90D

1Y

Response 200
{
  "latest": {
    "gold_585_rub_g": 8234.12,
    "gold_999_rub_g": 14047.23,
    "usd_rub": 91.3456,
    "bucket_ts_utc": "2026-03-11T12:00:00.000Z",
    "last_successful_fetch_utc": "2026-03-11T12:00:00.000Z",
    "is_stale": false,
    "source": "MOEX ISS"
  },
  "series": {
    "gold585": [
      {
        "ts": "2026-03-10T12:00:00.000Z",
        "value": 8210.10
      }
    ],
    "usdRub": [
      {
        "ts": "2026-03-10T12:00:00.000Z",
        "value": 91.1023
      }
    ]
  },
  "tablePreview": [
    {
      "ts": "2026-03-11T12:00:00.000Z",
      "gold_585_rub_g": 8234.12,
      "gold_999_rub_g": 14047.23,
      "usd_rub": 91.3456
    }
  ],
  "meta": {
    "range": "30D",
    "resolution": "daily",
    "normalization_supported": true,
    "table_supported": true,
    "source": "MOEX ISS"
  }
}
10.5. GET /api/quotes/history?range=7D
Purpose

Вернуть полные ряды для графиков и таблицы.

Allowed range

1D

7D

30D

90D

1Y

Response 200
{
  "range": "7D",
  "resolution": "intraday",
  "series": {
    "gold585": [
      {
        "ts": "2026-03-11T07:00:00.000Z",
        "value": 8200.10
      }
    ],
    "usdRub": [
      {
        "ts": "2026-03-11T07:00:00.000Z",
        "value": 91.2100
      }
    ]
  },
  "rows": [
    {
      "ts": "2026-03-11T07:00:00.000Z",
      "gold_585_rub_g": 8200.10,
      "gold_999_rub_g": 13986.84,
      "usd_rub": 91.2100
    }
  ],
  "meta": {
    "source": "MOEX ISS",
    "normalization_supported": true
  }
}
10.6. GET /api/table?range=30D&page=1&pageSize=100
Purpose

Вернуть таблицу в явном табличном формате.

Query params

range: 1D | 7D | 30D | 90D | 1Y

page: integer >= 1

pageSize: integer, default 100, max 500

Response 200
{
  "range": "30D",
  "resolution": "daily",
  "page": 1,
  "pageSize": 100,
  "totalRows": 30,
  "rows": [
    {
      "ts": "2026-03-11T12:00:00.000Z",
      "gold_585_rub_g": 8234.12,
      "gold_999_rub_g": 14047.23,
      "usd_rub": 91.3456
    }
  ]
}
10.7. GET /api/source/status
Purpose

Вернуть технический статус source layer.

Response 200
{
  "source": "MOEX ISS",
  "poll_interval_minutes": 5,
  "stale_threshold_minutes": 25,
  "last_successful_fetch_utc": "2026-03-11T12:00:00.000Z",
  "is_stale": false,
  "last_gold_status": "valid",
  "last_usd_status": "valid"
}
10.8. GET /api/alerts/rules
Response 200
[
  {
    "id": 1,
    "metric": "gold_585_rub_g",
    "rule_type": "ABS_DELTA",
    "threshold_value": 50,
    "cooldown_minutes": 30,
    "is_active": true
  }
]
10.9. POST /api/alerts/rules
Request body
{
  "metric": "gold_585_rub_g",
  "rule_type": "PCT_DELTA",
  "threshold_value": 0.5,
  "cooldown_minutes": 30,
  "is_active": true
}
Response 201
{
  "id": 2,
  "metric": "gold_585_rub_g",
  "rule_type": "PCT_DELTA",
  "threshold_value": 0.5,
  "cooldown_minutes": 30,
  "is_active": true
}
10.10. PATCH /api/alerts/rules/:id
Request body
{
  "threshold_value": 1.0,
  "is_active": false
}
Response 200
{
  "id": 2,
  "metric": "gold_585_rub_g",
  "rule_type": "PCT_DELTA",
  "threshold_value": 1.0,
  "cooldown_minutes": 30,
  "is_active": false
}
11. Business rules for UI
11.1. KPI

API всегда должен отдавать:

gold_585_rub_g

gold_999_rub_g

usd_rub

bucket_ts_utc

11.2. Charts

API всегда должен отдавать две серии:

gold585

usdRub

Запрещено отдавать отдельную chart series для gold_999_rub_g.

11.3. Table

API таблицы всегда должен отдавать колонки:

ts

gold_585_rub_g

gold_999_rub_g

usd_rub

12. Error contract
12.1. Unified error shape

Для всех бизнес-ошибок использовать:

{
  "error": {
    "code": "SOURCE_DATA_UNAVAILABLE",
    "message": "No valid source data found for requested range"
  }
}
12.2. Error codes

Допустимые значения error.code:

SOURCE_DATA_UNAVAILABLE

SOURCE_RESPONSE_INVALID

SOURCE_TIMEOUT

RANGE_NOT_SUPPORTED

BAD_REQUEST

INTERNAL_ERROR

13. HTTP status rules

Использовать только:

200 — success

201 — created

400 — bad request

404 — not found

422 — source/validation error

500 — internal error

503 — temporary source unavailable

14. Env contract

API и worker обязаны использовать такие env-переменные:

NODE_ENV

DATABASE_URL

MOEX_BASE_URL

POLL_INTERVAL_MINUTES

STALE_THRESHOLD_MINUTES

BACKFILL_DAILY_DAYS

BACKFILL_INTRADAY_DAYS

APP_TIMEZONE

SMTP_HOST

SMTP_PORT

SMTP_USER

SMTP_PASS

ALERT_FROM_EMAIL

ALERT_TO_EMAILS

Fixed values for MVP

MOEX_BASE_URL=https://iss.moex.com

POLL_INTERVAL_MINUTES=5

STALE_THRESHOLD_MINUTES=25

BACKFILL_DAILY_DAYS=365

BACKFILL_INTRADAY_DAYS=7

APP_TIMEZONE=Europe/Moscow

15. Acceptance criteria for API

API считается реализованным только если:

worker успешно читает latest quote для обоих инструментов;

worker успешно читает candles для обоих инструментов;

raw payload сохраняется в БД;

derived rows сохраняются в БД;

GET /api/health отвечает 200;

GET /api/quotes/latest возвращает KPI snapshot;

GET /api/dashboard возвращает данные для страницы;

GET /api/quotes/history возвращает series и rows;

GET /api/table возвращает таблицу;

GET /api/source/status показывает freshness;

API никогда не отдает отдельную graph series для 999;

stale статус работает по last_successful_fetch_utc.

16. Правило завершения

Код нельзя считать готовым, пока агент не:

реализовал этот контракт;

прогнал lint, typecheck, test, build;

проверил API живыми данными MOEX;

зафиксировал результат в docs/VERIFICATION_REPORT.md.