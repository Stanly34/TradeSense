# Plan: Push to Git (feature branch + PR) + Safe Live Deploy

## Date: 2026-10-15

## Goal
Push ~2 months of uncommitted work (branch `main` last committed Jul 13) to GitHub
`Stanly34/TradeSense` via feature branch + PR, then deploy to live without data loss.

## Context
- Remote `main` is ~2 months behind local: ~68 modified + ~60 new files.
- Live DB is already on the `Account` schema (Template→Account rename already applied
  on live), so the table-rename data-loss risk does NOT apply.
- `.env` files are gitignored — secrets will not be pushed.

## Step 1 — Hygiene (.gitignore)
Exclude junk from the commit:
- `server/prisma/dev.db` (local sqlite file) → `*.db`
- `client/vite.log.err` → `*.log.err`
- `lint_client.txt`, `tsc_client.txt` → `lint_*.txt`, `tsc_*.txt`
- `server/tmp.txt` → `tmp.txt`

## Step 2 — Verify before commit
- `npx tsc --noEmit` in `server/`
- `npx tsc -b` in `client/`
- `git status` — confirm no `.env` staged.

## Step 3 — Commit + push
- Branch: `feature/account-engine-and-journal-ux`
- Selective `git add` (everything except the junk above).
- Single commit: `feat: account engine, phase filtering, journal UX and dashboard polish`
- `git pull --rebase origin main` first, then push branch, open PR to `main`
  with summary + DB/deploy notes.

## Step 4 — Live deploy (after PR merge, on host)
1. Backup: `pg_dump` live DB.
2. Pull `main`, reinstall deps (root/server/client lockfiles changed).
3. `npx prisma db push` + `npx prisma generate` in `server/` (all changes since
   live's schema are additive nullable columns/tables — safe).
4. Backfills on live: `backfill-daykey.ts`, `backfill-phase.ts`; seed firms if
   missing: `seed-prop-firms.ts`.
5. Restart server + client together (new required-fields validation needs both).
6. NEVER run on live: `delete-demo-data.ts`, `cleanup.ts`, `seed-demo.ts`.
7. Smoke test: login → dashboard phase badge → journal trade → balance updates.

## Known deploy impacts (accepted)
- New-trade API 400s for stale cached clients missing the new required fields
  (`entryTime, exitTime, result, stopLoss, takeProfit`) — fixed by hard refresh;
  client + server ship together.
- Deleted `/api/templates` route + Templates/Billing/Calendar pages → 404 for
  old bookmarks only.
- Old trades untouched: reads don't validate, updates use `.partial()` schema.
