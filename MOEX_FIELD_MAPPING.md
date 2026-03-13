# MOEX Field Mapping

## Статус
Этот файл заполняется агентом ДО написания source-кода.
После заполнения mapping считается фиксированным контрактом проекта.

## 1. Latest: GLDRUB_TOM
### Endpoint
`/iss/engines/currency/markets/selt/boards/CETS/securities/GLDRUB_TOM.json?iss.only=marketdata,securities&iss.meta=off`

### Recorded at
- UTC datetime:
- HTTP status:

### Response blocks
- price source block:
- fallback block:
- security info block:

### Selected fields
- price field:
- source timestamp field:
- trading status field:
- board field:
- secid field:

### Example values
- price example:
- source timestamp example:

## 2. Latest: USD000UTSTOM
### Endpoint
`/iss/engines/currency/markets/selt/boards/CETS/securities/USD000UTSTOM.json?iss.only=marketdata,securities&iss.meta=off`

### Recorded at
- UTC datetime:
- HTTP status:

### Response blocks
- price source block:
- fallback block:
- security info block:

### Selected fields
- price field:
- source timestamp field:
- trading status field:
- board field:
- secid field:

### Example values
- price example:
- source timestamp example:

## 3. Candles: GLDRUB_TOM
### Daily endpoint
`/iss/engines/currency/markets/selt/boards/CETS/securities/GLDRUB_TOM/candles.json?iss.meta=off`

### Intraday endpoint
`/iss/engines/currency/markets/selt/boards/CETS/securities/GLDRUB_TOM/candles.json?iss.meta=off`

### Selected fields
- candles block:
- candle timestamp field:
- candle close field:
- daily interval used:
- intraday interval used:

## 4. Candles: USD000UTSTOM
### Daily endpoint
`/iss/engines/currency/markets/selt/boards/CETS/securities/USD000UTSTOM/candles.json?iss.meta=off`

### Intraday endpoint
`/iss/engines/currency/markets/selt/boards/CETS/securities/USD000UTSTOM/candles.json?iss.meta=off`

### Selected fields
- candles block:
- candle timestamp field:
- candle close field:
- daily interval used:
- intraday interval used:

## 5. Final mapping summary
После заполнения этого файла код использует только:
- зафиксированные response blocks;
- зафиксированные field names;
- зафиксированные interval values.

Изменять mapping после начала реализации запрещено.