# TradeSense — OpenCode Agent Guide

## How to start the project

- **PM2 (preferred, no terminal tabs):** `npm run start` (root) — uses `ecosystem.config.cjs` to run both servers in background. Stop with `npm run stop`.
- **Dev (two terminals):** `npm run dev` (root) — uses `concurrently` to run both.
- **Individually:** `cd server && npm run dev` (port 5000), `cd client && npm run dev` (port 5173).

## Project structure

- `/server` — Express + Prisma + PostgreSQL backend (ESM, TypeScript via `tsx`)
- `/client` — React 19 + Vite 8 + Tailwind CSS v4 frontend
- `/docs/TradeSense_PRD.md.txt` — product requirements doc

## Key scripts

| Command | Location | What |
|---|---|---|
| `npm run dev` | root | Starts both servers concurrently |
| `npm run start` | root | PM2 resume (background, no terminal tabs) |
| `npm run lint` | server | ESLint |
| `npm run lint` | client | Oxlint |
| `npm run typecheck` | server | `tsc --noEmit` |
| `npm run build` | client | `tsc -b && vite build` |
| `npm run build` | server | `tsc` |
| `npx prisma db push` | server | Sync schema without migration |
| `npx prisma migrate dev` | server | Create + apply migration |
| `npx prisma generate` | server | Regenerate Prisma Client after schema changes |

## Server quirks

- Entry: `server/src/server.ts` (not `index.ts`)
- Uses `tsx watch` for dev (no build step needed)
- `erasableSyntaxOnly: true` in tsconfig — no runtime enums
- `--env-file=.env` required in dev script
- Prisma at `server/prisma/schema.prisma`
- Vite proxies `/api` and `/uploads` → `localhost:5000`
- Admin credentials: `tradesenseapp@gmail.com` / `Admin123!` (demo user: `demo@tradesense.app` / `Demo123!`)
- Gmail SMTP configured: `tradesenseapp@gmail.com` with App Password in `.env`

## Client quirks

- Entry: `client/src/main.tsx`
- Tailwind CSS v4 with `@tailwindcss/vite` plugin (no `tailwind.config.js`)
- Path alias `@/` maps to `client/src`
- `useAuth()` hook provides auth context with `user`, `login`, `logout`, `refreshUser`
- Admin page (`/admin`) shows role-based tabs: MANAGER sees Users/Plans/Trades/Journals/Activity Log; ADMIN also sees Coupons/Settings
- New models require `npx prisma generate` on server

## Roles (server-enforced)

- `USER` — standard user
- `MANAGER` — can view stats/users/plans/trades/journals/audit logs, manage user roles (not ADMIN), activate/deactivate
- `ADMIN` — full access including plan CRUD, coupons, settings toggles

## Important conventions

- Do NOT add comments to code unless asked
- Run `npx tsc --noEmit` on server + `npx tsc -b` on client after changes
- Migration drift fix: use `npx prisma db push` (not `migrate dev`) to avoid data loss
- After schema changes, always run `npx prisma generate` in server
