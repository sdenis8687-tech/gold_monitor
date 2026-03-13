# Verification Report

## 1. Общая информация
- Date:
- Commit hash:
- Branch:
- Environment:
- Verified by:

## 2. Documents used
- AGENTS.md
- PRD.md
- SOURCE_DECISION.md
- LEGACY_FLOW_ANALYSIS.md
- MOEX_SOURCE_SPEC.md
- MOEX_FIELD_MAPPING.md
- ARCHITECTURE.md
- DB_SCHEMA.md
- API_SPEC.md
- IMPLEMENTATION_ORDER.md
- SELF_CHECK.md

## 3. Commands executed
- lint:
- typecheck:
- test:
- build:
- playwright:

## 4. Database verification
- migrations applied:
- seed applied:
- raw_quotes populated:
- derived_quotes populated:

## 5. Source verification
- latest GLDRUB_TOM:
- latest USD000UTSTOM:
- daily candles GLDRUB_TOM:
- daily candles USD000UTSTOM:
- intraday candles GLDRUB_TOM:
- intraday candles USD000UTSTOM:

## 6. Worker verification
- bootstrap backfill completed:
- polling completed:
- derived calculation completed:
- stale detection completed:

## 7. API verification
- /api/health:
- /api/quotes/latest:
- /api/dashboard:
- /api/quotes/history:
- /api/alerts/rules:

## 8. UI verification
- dashboard opened:
- KPI visible:
- gold chart shows only 585:
- usd chart visible:
- range switcher works:
- normalization works:
- table mode works:
- table columns correct:

## 9. Alerts verification
- ABS_DELTA:
- PCT_DELTA:
- DAILY_DIGEST:
- cooldown:

## 10. Live smoke details
- live source checked:
- source timestamp observed:
- stale badge checked:

## 11. Final status
- Ready for internal use: yes/no
- Blocking issues:
- Non-blocking issues: