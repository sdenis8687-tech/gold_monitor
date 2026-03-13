# Codex Web Handoff

## Что должно быть в репозитории до старта Codex Web
Добавь в репозиторий:
- `AGENTS.md`
- все файлы из `docs/`
- `docs/input/n8n-workflow.json`

## Как работать в Codex Web
Не проси Codex “сделать все сразу”.
Запускай работу по этапам из `docs/IMPLEMENTATION_ORDER.md`.

## Последовательность сессий

### Сессия 1
Цель:
- прочитать все документы;
- выполнить только Этапы 1–3;
- заполнить `docs/MOEX_FIELD_MAPPING.md`;
- сохранить MOEX fixtures в `tests/fixtures/moex`.

### Сессия 2
Цель:
- выполнить Этапы 4–6;
- собрать monorepo;
- реализовать Prisma schema;
- реализовать MOEX client.

### Сессия 3
Цель:
- выполнить Этапы 7–9;
- реализовать bootstrap backfill;
- реализовать polling worker;
- реализовать API.

### Сессия 4
Цель:
- выполнить Этапы 10–11;
- реализовать UI;
- реализовать alerts.

### Сессия 5
Цель:
- выполнить Этапы 12–14;
- реализовать тесты;
- прогнать self-check;
- заполнить verification report.

## Первый prompt для Codex Web
```text
Read AGENTS.md and all files in docs/.
Do not write product code yet.
Execute only the documentation and source-mapping stages from docs/IMPLEMENTATION_ORDER.md:
- confirm legacy logic from docs/input/n8n-workflow.json
- perform live MOEX source inspection
- fill docs/MOEX_FIELD_MAPPING.md
- save real MOEX fixtures under tests/fixtures/moex
- stop after this stage and summarize what was fixed in the repository