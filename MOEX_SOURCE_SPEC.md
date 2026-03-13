# MOEX Source Spec

## 1. Source of truth
Production source:
- `MOEX ISS`

## 2. Base URL
- `https://iss.moex.com`

## 3. Instruments
Использовать только:
- `GLDRUB_TOM`
- `USD000UTSTOM`

## 4. Market path
Использовать только:
- `engine = currency`
- `market = selt`
- `board = CETS`

## 5. Latest endpoints
Для latest quote использовать:
- `/iss/engines/currency/markets/selt/boards/CETS/securities/GLDRUB_TOM.json?iss.only=marketdata,securities&iss.meta=off`
- `/iss/engines/currency/markets/selt/boards/CETS/securities/USD000UTSTOM.json?iss.only=marketdata,securities&iss.meta=off`

## 6. Candles endpoints
Для candles использовать:
- `/iss/engines/currency/markets/selt/boards/CETS/securities/GLDRUB_TOM/candles.json?iss.meta=off`
- `/iss/engines/currency/markets/selt/boards/CETS/securities/USD000UTSTOM/candles.json?iss.meta=off`

Query params для candles:
- `from`
- `till`
- `interval`

## 7. History usage contract
Использование источника в приложении:
- latest endpoints — для live polling;
- candles endpoints — для bootstrap backfill;
- БД приложения — для serving layer;
- frontend не обращается к MOEX напрямую.

## 8. Polling contract
- worker schedule = каждые 5 минут;
- stale threshold = 25 минут;
- source status определяется по source timestamp.

## 9. Validation contract
Для каждой latest точки:
1. HTTP 200;
2. JSON parse success;
3. нужный block найден;
4. price field найден;
5. source timestamp field найден;
6. price > 0;
7. timestamp parse success;
8. row либо `valid`, либо `stale`, либо `rejected`.

Для каждой candle точки:
1. block candles найден;
2. candle time field найден;
3. candle close field найден;
4. close > 0;
5. timestamp parse success.

## 10. Resolution contract
Использовать:
- `intraday` resolution для `1D` и `7D`
- `daily` resolution для `30D`, `90D`, `1Y`

## 11. Bootstrap contract
Bootstrap при первом старте:
- daily history = 365 дней;
- intraday history = 7 дней;
- оба инструмента обязательны;
- на основе обоих рядов строятся derived rows.

## 12. Serving contract
В UI публикуется только derived data из PostgreSQL.
Raw MOEX payload используется:
- для аудита;
- для диагностики;
- для тестовых fixtures.

## 13. Internal-only scope
Этот проект реализуется как внутренний мониторинг заказчика.
Публичный data redistribution не входит в текущий scope продукта.