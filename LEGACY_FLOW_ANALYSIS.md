# Legacy Flow Analysis

## 1. Исходный workflow
Имя:
- `Мониторинг цены золота — Богачев v2`

## 2. Trigger
Тип:
- `scheduleTrigger`

Частота:
- 1 раз в час

## 3. Источник данных
Workflow делает HTTP-запрос на:
- `https://1000bankov.ru/kurs/gld/`

Формат:
- HTML страница

Способ извлечения:
- regex parsing

## 4. Регулярное выражение
Workflow ищет цену выражением:
- `Курс золота на сегодня ... по курсу ЦБ 1 грамм золота стоит ([\d.]+) рублей`

## 5. Что считается ценой 999
После regex parsing workflow формирует:
- `metal = gold_999`
- `price_rub_per_gram = parsed price`
- `source = 1000bankov.ru (по курсу ЦБ)`

## 6. Формула 585
Workflow считает:
- `p585_price = round(base_999_price * 585 / 999, 2)`

## 7. Работа с БД
Workflow читает предыдущую цену запросом:
- `SELECT price_999 FROM gold_prices ORDER BY created_at DESC LIMIT 1;`

Workflow пишет новую цену:
- `INSERT INTO gold_prices (created_at, price_999) VALUES (NOW(), <new_price>)`

Workflow берет историю за 30 дней:
- `SELECT DATE(created_at), AVG(price_999), MIN(price_999), MAX(price_999) ... GROUP BY DATE(created_at)`

## 8. Правило изменения цены
Workflow считает цену изменившейся, когда:
- `abs(newPrice - prevPrice) >= 0.01`

## 9. Уведомления
При `priceChanged = true` workflow:
- собирает HTML email;
- строит график через QuickChart;
- отправляет письмо через SMTP.

## 10. Фактическая архитектура старого решения
Поток:
- trigger
- HTTP request
- regex parsing
- расчет 585
- SQL read previous
- comparison
- SQL insert new row
- IF price changed
- SQL history 30 days
- build HTML email
- send SMTP email

## 11. Что переносится в новую систему
Переносим:
- формулу 585 через 999;
- хранение истории;
- сравнение с предыдущим значением;
- email alerts;
- исторический обзор.

## 12. Что заменяется
Заменяем:
- `1000bankov` → `MOEX ISS`
- HTML parsing → typed API parsing
- hourly schedule → 5-minute polling
- email-only UI → полноценный dashboard
- n8n runtime → `web + api + worker`

## 13. Legacy constraints
Ограничения текущего решения:
- источник не является официальным API;
- логика зависит от HTML-разметки;
- данные обновляются редко;
- dashboard отсутствует;
- USD/RUB отсутствует;
- нет таблицы;
- нет отдельного project codebase.