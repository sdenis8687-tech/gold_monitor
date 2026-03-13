# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Gold Monitor** — internal web application replacing a legacy n8n workflow for monitoring gold prices in Russian rubles and USD/RUB exchange rates. Data source is exclusively MOEX ISS.

The repository is currently in the **documentation phase**. All specification documents are at the root level (not yet moved to `docs/`). No source code exists yet.

## Commands

These commands will be available once the monorepo is scaffolded (Stage 4):

```bash
# From workspace root
pnpm lint          # ESLint across all packages
pnpm typecheck     # TypeScript type checking
pnpm test          # Vitest unit + integration tests
pnpm build         # Build all apps
pnpm playwright    # E2E smoke tests

# Run a single test file
pnpm vitest run packages/shared/src/calculator.test.ts
```

## Monorepo Structure (to build)

```
apps/web         # Next.js dashboard frontend
apps/api         # Fastify REST API
apps/worker      # Node.js MOEX polling service
packages/shared  # Shared TypeScript types, Zod schemas, calculators
packages/db      # Prisma schema, migrations, DB client
docs/            # Move spec files here (see AGENTS.MD for full list)
tests/fixtures/moex/  # Live MOEX API response fixtures
```

## Tech Stack (fixed — do not change)

- **Frontend:** Next.js + TypeScript + Tailwind CSS + shadcn/ui + Apache ECharts
- **Backend:** Fastify
- **ORM:** Prisma + PostgreSQL
- **Tests:** Vitest (unit/integration), Playwright (E2E)
- **Runtime:** Docker Compose

## Architecture

Three services + one database:

1. **worker** — polls MOEX ISS every 5 min, validates responses, writes to `raw_quotes`, calculates derived metrics, writes to `derived_quotes`, runs alert engine
2. **api** — reads from PostgreSQL only, exposes REST endpoints to frontend
3. **web** — fetches exclusively from `apps/api`, never calls MOEX directly
4. **postgres** — stores raw responses and derived metrics

**Data flow:** MOEX ISS → worker → PostgreSQL → api → web

## Hard Constraints

- Data source: **MOEX ISS only** (`https://iss.moex.com`)
- Instruments: `GLDRUB_TOM` (gold) and `USD000UTSTOM` (USD/RUB)
- Forbidden: Kitco, 1000bankov, any paid API, direct frontend→MOEX calls
- All timestamps stored in **UTC**; displayed in **Europe/Moscow**
- All raw MOEX responses saved separately from derived data

## Business Rules

```
gold_999_rub_g = last_price(GLDRUB_TOM)
gold_585_rub_g = round(gold_999_rub_g * 585 / 999, 2)
usd_rub        = last_price(USD000UTSTOM)
```

- Gold chart shows **only 585** (never 999)
- Gold 999 appears only in KPI and table
- Both charts share one time axis
- Stale threshold: 25 minutes since last successful fetch
- Polling interval: 5 minutes
- Normalization: `round(value / first_visible_value * 100, 2)`

## Resolution Layers

| Range | Resolution | Source endpoint |
|-------|-----------|-----------------|
| 1D, 7D | `intraday` | 10-min candles |
| 30D, 90D, 1Y | `daily` | daily candles |

## Bootstrap (worker first run)

- Backfill 365 days of daily candles
- Backfill 7 days of intraday candles
- Write raw + derived rows for all backfilled data

## Implementation Stages

See `IMPLEMENTATION_ORDER.md` for the 14-stage roadmap. Current status: **Stages 1–2 complete** (docs exist; n8n legacy file needs to be added). **Stage 3** (live MOEX field mapping + fixtures) must be completed before writing any code.

Before writing code, always read the spec documents in this order (per `AGENTS.MD`):
`docsPRD.md` → `SOURCE_DECISION.md` → `LEGACY_FLOW_ANALYSIS.md` → `MOEX_SOURCE_SPEC.md` → `MOEX_FIELD_MAPPING.md` → `docsARCHITECTURE.md` → `DB_SCHEMA.md` → `API.md` → `IMPLEMENTATION_ORDER.md` → `SELF_CHECK.md`

## Definition of Done

Task is complete only when:
- Docker Compose starts all services
- Worker writes data to PostgreSQL
- API serves current and historical data
- UI shows KPI, two synchronized charts, and table
- Playwright smoke test passes
- `docs/VERIFICATION_REPORT.md` is filled out
- `lint`, `typecheck`, `test`, `build`, `playwright` all pass
