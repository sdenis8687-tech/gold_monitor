# Self Check

## 1. Документы
Перед кодом должны существовать:
- `AGENTS.md`
- `docs/PRD.md`
- `docs/SOURCE_DECISION.md`
- `docs/LEGACY_FLOW_ANALYSIS.md`
- `docs/MOEX_SOURCE_SPEC.md`
- `docs/MOEX_FIELD_MAPPING.md`
- `docs/ARCHITECTURE.md`
- `docs/DB_SCHEMA.md`
- `docs/API_SPEC.md`

## 2. Команды
Перед завершением обязательно выполнить:
- `lint`
- `typecheck`
- `test`
- `build`
- `playwright`

## 3. Проверка БД
Убедиться, что:
- миграции применяются;
- seed alert rules работает;
- таблицы созданы;
- записи появляются в `raw_quotes`;
- записи появляются в `derived_quotes`.

## 4. Проверка source layer
Убедиться, что:
- latest `GLDRUB_TOM` парсится;
- latest `USD000UTSTOM` парсится;
- intraday candles `GLDRUB_TOM` парсятся;
- intraday candles `USD000UTSTOM` парсятся;
- daily candles `GLDRUB_TOM` парсятся;
- daily candles `USD000UTSTOM` парсятся.

## 5. Проверка worker
Убедиться, что worker:
- стартует;
- выполняет bootstrap backfill;
- запускается каждые 5 минут;
- пишет raw rows;
- пишет derived rows;
- считает `gold_585_rub_g` корректно;
- считает stale flag корректно.

## 6. Проверка API
Убедиться, что:
- `GET /api/health` = 200
- `GET /api/quotes/latest` возвращает `gold_585_rub_g`, `gold_999_rub_g`, `usd_rub`
- `GET /api/dashboard?range=30D` возвращает latest, series, tablePreview
- `GET /api/quotes/history?range=7D` возвращает rows для графика и таблицы

## 7. Проверка UI вручную
Нужно проверить:
- страница открывается;
- KPI видны;
- золотой график показывает только `585`;
- график `USD/RUB` виден отдельно;
- переключение периода работает;
- режим нормализации работает;
- `Таблица` переключает режим;
- в таблице видны `585`, `999`, `USD/RUB`;
- stale badge отображается корректно.

## 8. Проверка Playwright
Обязательный smoke scenario:
1. открыть главную страницу;
2. дождаться KPI;
3. убедиться, что присутствуют 2 графика;
4. переключить range;
5. переключить normalisation mode;
6. нажать `Таблица`;
7. убедиться, что таблица видна;
8. убедиться, что в таблице есть колонки `585`, `999`, `USD/RUB`.

## 9. Проверка alerts
Нужно проверить:
- ABS_DELTA rule;
- PCT_DELTA rule;
- cooldown;
- daily digest.

## 10. Live smoke
Перед завершением обязательно:
- сделать live запрос к MOEX ISS;
- убедиться, что ответ приходит;
- убедиться, что source timestamp попал в приложение.

## 11. Финальный артефакт
Перед завершением должен существовать:
- `docs/VERIFICATION_REPORT.md`

В отчете должны быть:
- commit hash;
- список команд;
- список пройденных тестов;
- описание live smoke;
- подтверждение, что золотой график показывает только `585`.