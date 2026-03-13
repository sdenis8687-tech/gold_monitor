# Gold Monitor

Внутренний мониторинг цен на золото и USD/RUB на основе данных MOEX ISS.

## Быстрый старт (Docker)

```bash
# 1. Скопировать переменные окружения
cp .env.example .env
# Отредактировать .env (SMTP настройки опциональны)

# 2. Запустить все сервисы
docker-compose up --build

# 3. Применить миграции БД (при первом запуске выполнится автоматически через worker)
# или вручную:
docker-compose exec api npx prisma migrate deploy
docker-compose exec api npx prisma db seed
```

Открыть: http://localhost:3000

## Разработка

```bash
# Установка зависимостей
pnpm install

# Генерация Prisma клиента
pnpm --filter @gold-monitor/db db:generate

# Запуск PostgreSQL (отдельно)
docker-compose up postgres -d

# Применить миграции
DATABASE_URL=postgresql://gold:goldpass@localhost:5432/goldmonitor pnpm --filter @gold-monitor/db db:migrate

# Запуск сервисов в dev режиме (в разных терминалах)
pnpm --filter @gold-monitor/api dev    # :4000
pnpm --filter @gold-monitor/worker dev
pnpm --filter @gold-monitor/web dev    # :3000
```

## Команды

```bash
pnpm lint        # ESLint
pnpm typecheck   # TypeScript
pnpm test        # Vitest (unit + integration)
pnpm build       # Сборка всех пакетов
pnpm playwright  # E2E тесты (нужен запущенный сервер)
```

## Архитектура

```
MOEX ISS → worker → PostgreSQL → api → web
```

- **worker** (:нет порта) — опрашивает MOEX каждые 5 мин, bootstrap 365 дней
- **api** (:4000) — Fastify REST API
- **web** (:3000) — Next.js dashboard
- **postgres** (:5432) — хранилище данных
