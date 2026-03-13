# Gold Monitor

## Роль агента
Ты создаешь полный внутренний web-продукт мониторинга цены золота для заказчика.
Работай по документам репозитория.
Не меняй источник данных, архитектурные решения и product scope.
Не задавай уточняющие вопросы.
Не предлагай альтернативный источник.
Не переноси n8n в runtime новой системы.

## Обязательные входные документы
Перед началом кода прочитай в таком порядке:
1. `docs/PRD.md`
2. `docs/SOURCE_DECISION.md`
3. `docs/LEGACY_FLOW_ANALYSIS.md`
4. `docs/MOEX_SOURCE_SPEC.md`
5. `docs/MOEX_FIELD_MAPPING.md`
6. `docs/ARCHITECTURE.md`
7. `docs/DB_SCHEMA.md`
8. `docs/API_SPEC.md`
9. `docs/IMPLEMENTATION_ORDER.md`
10. `docs/SELF_CHECK.md`
11. `docs/VERIFICATION_REPORT_TEMPLATE.md`
12. `docs/CODEX_WEB_HANDOFF.md`

## Жестко зафиксированные решения
- Новый продукт предназначен для внутреннего мониторинга заказчика.
- Публичная раздача данных, перепродажа и multi-tenant режим не входят в scope.
- Production source только один: `MOEX ISS`.
- Production instruments только два:
  - `GLDRUB_TOM`
  - `USD000UTSTOM`
- Запрещено:
  - использовать Kitco как источник данных;
  - парсить HTML Kitco;
  - использовать 1000bankov как production source;
  - использовать платные API;
  - использовать другой production-source;
  - строить frontend на прямых запросах в MOEX.

## Что должно получиться
Итоговый продукт обязан содержать:
- одну главную страницу;
- KPI:
  - `Золото 585, ₽/г`
  - `Золото 999, ₽/г`
  - `USD/RUB`
  - `Последнее обновление`
- два синхронных графика:
  - `Золото 585, ₽/г`
  - `USD/RUB`
- переключатель периода:
  - `1D`
  - `7D`
  - `30D`
  - `90D`
  - `1Y`
- режим сравнения:
  - `Абсолютные значения`
  - `Нормализовать к 100`
- кнопку `Таблица`
- табличный режим
- email-уведомления по порогам
- PostgreSQL-хранилище истории
- Docker Compose запуск
- автопроверку и финальный verification report

## Точные бизнес-правила
Используй только эти формулы:
- `gold_999_rub_g = last_price(GLDRUB_TOM)`
- `gold_585_rub_g = round(gold_999_rub_g * 585 / 999, 2)`
- `usd_rub = last_price(USD000UTSTOM)`

Правила отображения:
- `999` показывать только в KPI и в таблице
- `999` не показывать на графике
- золотой график всегда показывает только `585`
- оба графика работают на одной временной шкале
- таблица показывает те же данные, что и графики, за выбранный период

## Технический стек
Используй только этот стек:
- Frontend: `Next.js` + `TypeScript` + `Tailwind` + `shadcn/ui`
- Backend: `Fastify`
- ORM/DB access: `Prisma`
- Database: `PostgreSQL`
- Charts: `Apache ECharts`
- E2E: `Playwright`
- Unit/Integration tests: `Vitest`
- Containerization: `Docker Compose`

## Структура репозитория
Собери такой layout:
- `apps/web`
- `apps/api`
- `apps/worker`
- `packages/shared`
- `packages/db`
- `docs`
- `tests`

## Источник данных
Базовый URL:
- `https://iss.moex.com`

Работай только с путями из `docs/MOEX_SOURCE_SPEC.md`.

## Важные правила реализации
- Все timestamps хранить в UTC.
- В UI отображать время в `Europe/Moscow`.
- Frontend не должен ходить в MOEX напрямую.
- Frontend ходит только в `apps/api`.
- Worker ходит в MOEX, валидирует ответ и пишет в БД.
- API читает только из БД приложения.
- Все сырые ответы MOEX сохранять отдельно от derived данных.
- Все live-ответы MOEX, использованные для разработки, зафиксировать как fixtures в `tests/fixtures/moex`.
- Перед кодом заполнить `docs/MOEX_FIELD_MAPPING.md`.
- После завершения самопроверки создать `docs/VERIFICATION_REPORT.md`.

## Обязательные тесты
Нужно реализовать:
- unit tests для расчетов;
- unit tests для валидации source data;
- integration tests для парсинга MOEX fixtures;
- Playwright smoke test для UI.

## Запрет на незавершенную сдачу
Задача не завершена, пока не существует:
- рабочий dashboard;
- кнопка `Таблица`;
- график золота только с `585`;
- `docs/VERIFICATION_REPORT.md`;
- прошедшие `lint`, `typecheck`, `test`, `build`, `playwright`.

## Definition of Done
Работа считается завершенной только если:
- код сгенерирован полностью;
- продукт запускается через Docker Compose;
- worker пишет данные в PostgreSQL;
- API отдает текущие и исторические данные;
- UI открывается и показывает KPI, графики и таблицу;
- Playwright smoke test проходит;
- verification report заполнен.