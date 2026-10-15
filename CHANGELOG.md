# Changelog

## Unreleased

### Fixed
- Trade images blocked by Content Security Policy — added `https://res.cloudinary.com` to Helmet `img-src`
- Outlook Before/After Week image previews blocked by CSP — added `blob:` to Helmet `img-src`
- Pro subscription lost after profile edit, avatar upload, or avatar delete — all user-returning endpoints now include `subscription.plan` via shared Prisma include

### Changed
- Replaced raw `fetch` with `api.post()` for trade image uploads to ensure proper error handling
- Refreshed trade state in TradesPage and TradeDetailPage after image upload so images appear immediately
- Exposed `refresh` method from `usePlan` hook for client-side plan state synchronization

### Removed
- Temporary diagnostic logging added during root cause investigation for Pro plan and image display bugs
- Temporary diagnostic logging for forgot-password email flow (root cause found)

### Investigated
- **Forgot-password email delivery failure** — HTTP 200 returned, Brevo API succeeded, but Gmail deferred delivery
- **Root cause**: Gmail rate-limiting (`421 4.7.28`) mail from Brevo's shared sending domain (`11680855.brevosend.com`) when using a Gmail sender address
- **CLIENT_URL misconfiguration** — Production server missing `CLIENT_URL` env var, causing password reset links to use `http://localhost:5173`
- **CLIENT_URL fixed** — Set to `https://tradesense-pas4.onrender.com` in Render environment variables

## [1.0.0] - 2025-02-01

### Added
- Initial TradeSense release

[1.0.0]: https://github.com/Stanly34/TradeSense/releases/tag/v1.0.0

## 2026-09-06 — Scroll to first error field
- **Scroll to error**: On form submit with validation errors, now scrolls centered to the first error field (top→bottom priority: account → instrument → entry/exit price → result → trade window → stop loss → take profit). Previously scrolled to top of form.
- **data-field anchors**: Added `data-field` attributes on field wrappers for reliable targeting: account (`751`), instrument (`949`), entryPrice (`1018`), exitPrice (`1023`), result (`994`), entryTime/Trade Window (`1033`), stopLoss (`1117`), takeProfit (`1121`).
- **JournalFormPage fix**: After switching to invalid tab, re-validates in `requestAnimationFrame` so scroll happens on the now-visible tab.

Files: `client/src/components/trades/TradeForm.tsx`, `client/src/pages/JournalFormPage.tsx`

## 2026-09-06 — Phase pills → current phase badge + viewing dropdown
- **Current phase always visible**: Replaced the row of phase pills with a single always-on badge showing current phase (e.g. `Phase 1 • Current` or `FUNDED • Current`).
- **Viewing dropdown**: Past phases now accessible via a compact `Viewing: Current` dropdown button on the right. Options: Current (default), All Phases, and each past phase. Clicking a past phase shows a warning pill `Viewing: Phase 1` and filters calendar + stats.
- **Dropdown UX**: Same pattern as account dropdown — button with chevron, close on outside click, `bg-primary text-white` for selected option.
- **Edge cases**: Dropdown only shows when >1 phase exists. Switching accounts resets to Current.

Files: `client/src/pages/DashboardPage.tsx`

## 2026-09-06 — Trade form required fields
- **Required fields**: Made Entry Time, Exit Time, Result, Stop Loss, and Take Profit required when journaling a trade. Previously only Instrument, Entry Price, and Exit Price were required.
- **Client validation**: Added 5 new rules in `validate()` — errors shown inline for all required fields.
- **Server validation**: Updated `createTradeSchema` — all 5 fields now required (no `.optional()`). `updateTradeSchema` remains `.partial()` for edits.
- **Result conditional**: Only required when status is COMPLETED (matches form UI which only shows Result buttons for COMPLETED trades).

Files: `client/src/components/trades/TradeForm.tsx`, `server/src/validators/trade.ts`

## 2026-09-06 — Demo data cleanup + Phase pills visibility fix
- **Demo data deleted**: Ran `prisma/delete-demo-data.ts` — deleted all trades, accounts, events, snapshots, tags, outlooks, notifications, AI data for demo@tradesense.app. User account preserved.
- **Phase pills visibility fix**: Phase pills now only appear when a PROP_FIRM account is selected (`selectedAccount.type === 'PROP_FIRM'`). Previously showed for all account types.

Files: `client/src/pages/DashboardPage.tsx`

## 2026-09-06 — Phase pills on Dashboard + Account balance sync fix
- **Bug fix — Account balance not updating**: `AccountsPage.tsx` was missing a `trades:changed` event listener. After journaling a trade, the server correctly updated the account balance via `reconcileAccount`, but the client never re-fetched `ChallengeProgress`. Added `trades:changed` listener to refresh `progressMap` for the affected account.
- **Feature — Phase pills on Dashboard**: Added `phase String?` field to Trade model. Server computes phase from account's `phaseIndex` on trade create/update. Dashboard now shows phase pill buttons `[ ALL ] [ Phase 1 ✓ ] [ Phase 2 ] [ Funded ]` above Challenge Metrics. Default: current phase auto-selected. Clicking pills filters calendar + stats to that phase. "ALL" shows everything. Phase pills reset when switching accounts.
- **Schema**: Added `phase String?` to Trade model with index (`server/prisma/schema.prisma`)
- **Server**: `createTrade`/`updateTrade` set `phase` from account's `phaseIndex` (`server/src/services/trade.ts`)
- **Dashboard API**: Added `phase?` param to `getStats` + `getCalendarData` (`server/src/services/dashboard.ts`, `server/src/controllers/dashboard.ts`)
- **Client service**: Added `phase?` param to `getStats` + `getCalendarData` (`client/src/services/dashboard.ts`)
- **TradeCalendar**: Added `phase` prop (`client/src/components/dashboard/TradeCalendar.tsx`)
- **Backfill**: `server/prisma/backfill-phase.ts` — tagged 4 existing trades with correct phase
- **Verified**: `npx tsc --noEmit` server + client pass, servers running (200/200)

Files: `client/src/pages/AccountsPage.tsx`, `server/prisma/schema.prisma`, `server/src/services/trade.ts`, `server/src/services/dashboard.ts`, `server/src/controllers/dashboard.ts`, `client/src/services/dashboard.ts`, `client/src/pages/DashboardPage.tsx`, `client/src/components/dashboard/TradeCalendar.tsx`, `server/prisma/backfill-phase.ts`

## 2026-09-06 — Server-side dayKey column (fix calendar UTC bug) + TradeDetailPage crash fix
- **Schema**: Added `dayKey String?` column to Trade model with index (`server/prisma/schema.prisma`)
- **Server compute**: `createTrade` and `updateTrade` in `server/src/services/trade.ts` now compute `dayKey` from `entryTime` using local date methods (`getFullYear/getMonth/getDate`)
- **Backfill**: `server/prisma/backfill-daykey.ts` — one-time script, populated 3 existing trades
- **Dashboard grouping**: `server/src/services/dashboard.ts` — replaced all `entryTime.toISOString().slice(0,10)` with `t.dayKey` (lines 51, 79, 151)
- **Analytics grouping**: `server/src/services/analytics.ts` — replaced all UTC date grouping with `t.dayKey` (lines 71, 112, 225, 238, 413, 417, 526, 562-570). Fixed `mondayKey()` to use local date methods.
- **TradeDetailPage crash**: Fixed `dayDate` typo → `dayKey` with proper date parsing (`TradeDetailPage.tsx:51`)
- **Verified**: `npx tsc --noEmit` server + client pass, servers running (200/200)

Files: `server/prisma/schema.prisma`, `server/src/services/trade.ts`, `server/src/services/dashboard.ts`, `server/src/services/analytics.ts`, `server/prisma/backfill-daykey.ts`, `client/src/pages/TradeDetailPage.tsx`

## 2026-09-06 — Trade date grouping, cache, funded profit target, detail page fixes
- **Fix 1 — Trade date grouping (UTC→local)**: `tradeDayKey()` in `tradeMath.ts` and `todayStr` in `TradesPage.tsx` now use local `getFullYear()/getMonth()/getDate()` instead of `toISOString().slice(0,10)` (which returned UTC date). Trades entered late IST (e.g. 2:34 AM) now group under the correct day.
- **Fix 2 — Dashboard cache**: Added `clearCache()` calls after every mutation in `trades.ts` (create/update/delete/batchDelete) and `journals.ts` (upsert/delete). Dashboard now reflects newly journaled trades immediately.
- **Fix 3 — Funded account profit target**: Target Profit card on Dashboard wrapped with `{selectedAccount.phase !== 'FUNDED' && ...}` — hidden for funded accounts which don't have evaluation targets. Daily/Max Drawdown cards still show.
- **Fix 4 — Trade detail page + lint fix**: Removed sticky header (`scrolled` state, scroll listener, compact header, max-h wrapper) that caused double-header. Added account name to breadcrumb (`TradesPage → Journal → AccountName`). Fixed extra `</div>` in `DashboardPage.tsx:717` that caused adjacent JSX lint error.
- **Deleted demo data**: Ran `prisma/delete-demo-data.ts` — deleted 561 trades, 179 accounts, 205 events, 180 snapshots, 3 tags, 1 favorite, 1 outlook, 1 trade image for demo@tradesense.app. User account preserved.
- **Verified**: `npx tsc --noEmit` client pass, `npx oxlint` zero errors in DashboardPage.tsx

Files: `client/src/lib/tradeMath.ts`, `client/src/pages/TradesPage.tsx`, `client/src/services/trades.ts`, `client/src/services/journals.ts`, `client/src/pages/DashboardPage.tsx`, `client/src/pages/TradeDetailPage.tsx`, `server/prisma/delete-demo-data.ts`

## 2026-08-31 — Sync Accounts ↔ Dashboard ↔ Journal ↔ Outlook (event bus + cross-tab)
- **New**: `eventBus` (`client/src/lib/eventBus.ts`) — typed `accounts:changed`, `trades:changed`, `outlook:changed`, `payouts:changed` with debounce
- **New**: `crossTabSync` (`client/src/lib/crossTabSync.ts`) — BroadcastChannel + storage event for `tradesense_calendar_account` — `initCrossTabSync` in `main.tsx`
- **Services emit**: `accounts.ts` (create/update/delete/batchDelete/toggleFavorite/overrideStatus/reset/addPayout/removePayout), `trades.ts` (create/update/delete/batchDelete), `outlook.ts` (save/delete/batchDelete), `journals.ts` (upsert/delete) — mutate → emit → all pages auto-refresh
- **Pages subscribe**: `DashboardPage` (accounts/trades/payouts → `refreshKey`), `AccountsPage` (accounts/payouts → reload), `TradesPage` + `JournalPage` (trades → refetch), `OutlookPage` (outlook → refetch)
- **Cross-tab**: Dashboard selectedAccountId broadcasts via `broadcastStorage` and listens via `onStorageChange`
- **Result**: Add trade/account/payout/outlook in one tab/route → Dashboard, Accounts, Journal, Outlook update everywhere without manual refresh or navigation
- **Verified**: `tsc -b` client + `tsc --noEmit` server pass; restarted hidden server 3396 + client 23852 (200/200)

Files: `client/src/lib/eventBus.ts`, `client/src/lib/crossTabSync.ts`, `client/src/services/accounts.ts`, `client/src/services/trades.ts`, `client/src/services/outlook.ts`, `client/src/services/journals.ts`, `client/src/pages/DashboardPage.tsx`, `client/src/pages/AccountsPage.tsx`, `client/src/pages/TradesPage.tsx`, `client/src/pages/OutlookPage.tsx`, `client/src/pages/JournalPage.tsx`, `client/src/main.tsx`

## 2026-08-30 — Marquee speed, profit precision, dashboard, plans, funded gain, payouts
- **Marquee**: fixed fast scroll when many accounts — duration now `max(45, len*4)s` and tiling repeats single account to 20 copies (`displayItems`) for continuous slow scroll (`client/src/pages/AccountsPage.tsx:237,245,306`, `client/src/index.css:230`)
- **Profit precision**: everywhere profit now shows exact cents e.g. `201.25` — fixed `Math.round/toFixed(0)` truncations to `toLocaleString({minimumFractionDigits:2,maximumFractionDigits:2})` (`AccountDetailModal.tsx:32`, `AccountFormModal.tsx:39,375`, `DashboardPage.tsx:86,278,506,694`, `TradeCalendar.tsx:24,213,292`, `AccountsPage.tsx:247,251`, `AccountCard.tsx:25`)
- **Dashboard mobile**: `Today's Profit` / `Week Profit` hidden on mobile (`hidden lg:grid`), visible desktop (`DashboardPage.tsx:378`)
- **Plans**: grid now `1→2→3 cols` (`md:grid-cols-2 lg:grid-cols-3`) and tabs `Plans | Billing History` like Checklist/Journal (`PlansPage.tsx:186,192`)
- **Dashboard layout**: moved `Trading Behaviour` below `TradeCalendar` (was above Challenge Metrics) (`DashboardPage.tsx:742`)
- **Funded %**: dial now shows gain on accountSize (`(totalPnl/accountSize)*100` e.g. +5.23%) instead of fixed 100%, with `gain` label and violet/danger color (`ProgressDial.tsx:13`)
- **Payouts**: unique card redesign — Wallet header, pill stats, empty illustration, hover rows, `$` input + `Info` note: `$52,300 - $100 → $52,200` (`AccountDetailModal.tsx:449`)
- **Verified**: `tsc -b` client + `tsc --noEmit` server pass; restarted hidden server 5484 + client 24032 (200/200)

Files: `client/src/pages/AccountsPage.tsx`, `client/src/index.css`, `client/src/components/accounts/AccountDetailModal.tsx`, `client/src/components/accounts/AccountFormModal.tsx`, `client/src/pages/DashboardPage.tsx`, `client/src/components/dashboard/TradeCalendar.tsx`, `client/src/components/accounts/AccountCard.tsx`, `client/src/pages/PlansPage.tsx`, `client/src/components/accounts/ProgressDial.tsx`

## 2026-08-27 — Manual "Set status" pass flow fixed (persisted + correct phase)
- **Bug fix**: manual PASSED/FUNDED from AccountDetailModal did not persist — `reconcileAccount` (called after `overrideStatus`) replayed from `startPhaseIndex` and overwrote the manual phase change. `overrideStatus` now sets `defaultValues.manualStatus = 'PASSED'|'FUNDED'`; `reconcileAccount` early-return respects it (PASSED keeps advanced phase + fresh balance, FUNDED -> FUNDED, FAILED -> FAILED) without replaying.
- **Bug fix**: `getChallengeProgress` forced `phase:'FUNDED'` for any manual PASSED, wrong for 2-step accounts at PHASE2. Now returns `fresh.phase` for PASSED/FAILED and `FUNDED` for FUNDED; `phaseIndex` now reflects the advanced phase.
- **Verified (browser + API)**: 2-step PASSED -> PHASE2 fresh 50k balance; 1-step PASSED -> FUNDED fresh 100k; clear -> PHASE1 auto resumed. Dashboard per-account filter and calendar confirmed working.

Files: `server/src/services/account.ts`, `server/src/services/accountEngine.ts`

## 2026-08-23 — Sidebar labels on mobile + plans stack vertically
- **Sidebar**: when mobile sidebar is open (hamburger), labels/names always visible regardless of desktop expanded state
- **Plans page**: removed inline gridTemplateColumns style; plans now use responsive Tailwind grid stacking one per row on mobile

Files: `layout/Sidebar.tsx`, `pages/PlansPage.tsx`

## 2026-08-23 - Mobile responsive design (global shell + all pages)
- **Global CSS**: `overflow-x-hidden` on html/body; `100dvh` fallback for `.h-screen`; form inputs font-size >= 16px (prevents iOS auto-zoom)
- **Modal**: bottom-sheet style on mobile (full-width, rounded-t-2xl, slides up from bottom); centered card on desktop
- **ConfirmDialog**: same mobile behavior (bottom-sheet, rounded-t-2xl, full-width on mobile; centered sm:max-w-sm on desktop)
- **TopBar**: compact h-12 on mobile (sm:h-14 desktop), icon buttons p-2 (was p-2.5)

Files: `index.css`, `ui/Modal.tsx`, `ui/ConfirmDialog.tsx`, `layout/TopBar.tsx`
# Changelog

## 2026-08-23 — Mobile sidebar always-expanded + remove X button + topbar breadcrumb alignment
- **Mobile sidebar**: forced expanded (names visible) when opened via hamburger; removed X close button (backdrop tap + nav link click close it).
- **TopBar**: breadcrumbs/back aligned LEFT (removed `mr-auto` push from hamburger); hover on crumb links → indigo.

Files: `layout/Sidebar.tsx`, `layout/TopBar.tsx`

## 2026-08-23 — SelectionBar z-index fix + mobile sidebar slide-in
- **SelectionBar**: replaced inline `zIndex: 99999` with Tailwind `z-40` class — delete confirmation dialogs (z-[80]) now render above the selection bar instead of behind it.
- **Sidebar mobile slide-in**: on screens < lg the sidebar is `fixed -translate-x-full` (hidden) by default; hamburger toggle slides it to `translate-x-0` with backdrop. On ≥ lg it remains `static` and always visible with expanded/collapsed width toggle.

Files: `ui/SelectionBar.tsx`, `layout/Sidebar.tsx`

## 2026-08-23 — Sidebar sign-out confirm + checklists inline-creation removal
- **Sidebar sign-out**: now shows "Sign out?" ConfirmDialog before logging out.
- **ChecklistsManager**: removed old inline text-input + Add button for creating checklists — all creation flows through the PageHeader "New Checklist" button (TradesPage). Removed orphaned `newName` state and `handleCreate` function.

Files: `layout/Sidebar.tsx`, `components/checklists/ChecklistsManager.tsx`

## 2026-08-23 — Journal form dropdown clipping fix + cancel confirmation
- **Dropdown panels no longer hidden by next section**: added `.card:focus-within { z-index: 10; position: relative; }` — when interacting with any Select inside a card section, that section rises above adjacent sections so the dropdown renders fully.
- **Cancel button dirty-check**: Cancel shows "Discard changes?" ConfirmDialog only when at least one trade form has content (via `hasContent()` on any TradeFormHandle ref).
- Added `useEffect` import for snapshot initialization.

Files: `index.css`, `JournalFormPage.tsx`

## 2026-08-23 — Checklists: New Checklist button in header + dialog creation
- When Checklists tab is active on Journals page, PageHeader shows "New Checklist" button (replaces "New Journal")
- Clicking opens a themed Modal asking for checklist name → creates via API → refreshes list
- ChecklistsManager no longer has inline name-input creation — all creation flows through the header button
- `refreshKey` prop triggers refetch after external creation

Files: `pages/TradesPage.tsx`, `components/checklists/ChecklistsManager.tsx`

## 2026-08-23 — TopBar contextual visibility + FirmDetail cleanup + instrument filter + sign-out sidebar
- **TopBar contextual**: theme/bell/profile icons only render on main sidebar pages; hidden entirely on detail/nested routes (breadcrumbs still show). Sign-out removed from TopBar (lives in Sidebar).
- **FirmDetailPage**: "All futures/forex prop firms" back link removed — TopBar breadcrumbs handle navigation.
- **Instrument filter**: selector groups filtered by selected account's `marketType` (FOREX → forex/CFDs, FUTURES → futures).
- **Sign out always visible on sidebar** regardless of collapse state.

Files: `layout/TopBar.tsx` (clean rewrite), `layout/Sidebar.tsx`, `pages/FirmDetailPage.tsx`, `components/trades/TradeForm.tsx`

## 2026-08-23 — Instrument filter + sign-out always visible
- **Instrument selector filters by account market type**: FOREX accounts show only forex/CFD pairs, FUTURES accounts show only futures instruments.
- **Sign out always visible on sidebar** — removed collapse-hiding behavior; icon-only when collapsed, icon+text when expanded.
- **TradeFilters Clear button** styled to match Select triggers (bordered input style).

Files: `components/trades/TradeForm.tsx`, `components/trades/TradeFilters.tsx`, `layout/Sidebar.tsx`

## 2026-08-23 — Edit trade full-page + gallery cleanup + topbar breadcrumbs for detail pages
- **Edit → full page**: TradeDetailPage Edit button now navigates to `/trades/:id/edit` rendering a dedicated TradeEditPage (full-width, no popup chrome). Old inline `showEdit`/`TradeForm` block removed.
- **TradeGallery**: fullscreen button removed entirely; delete button only visible when `isEditing=true`. Download kept in both modes.
- **TopBar breadcrumbs**: `/trades/new`, `/trades/:id`, and `/trades/:id/edit` routes now show proper crumb trail (`Journals / New Journal` etc.) in TopBar left zone.

Files: `pages/TradeEditPage.tsx` (new), `routes/index.tsx`, `pages/TradeDetailPage.tsx`, `components/trades/TradeGallery.tsx`

## 2026-08-23 — Account selector indigo + sidebar reorder + Journals⇄Outlook alignment
- **Account selector**: selected account shows solid `bg-primary text-white font-medium` in both TradeForm dropdown instances; panel solidified from translucent to opaque `bg-elevated`.
- **Sidebar reordered**: Dashboard → Journals → Outlook → Accounts → Prop Firms → Learn → Analytics → Plans → Settings
- **Journals⇄Outlook**: both pages share identical shell (container, PageHeader, card patterns, spacing) with different content.

Files: `layout/Sidebar.tsx`, `components/trades/TradeForm.tsx`

## 2026-08-23 — Mega-run: sign out + TS logo + full-page form + plans premium + breadcrumbs + checklists v2 + BE colors + parallel save + instrument filter + Explore removal

**Sidebar**: Sign out button added at very bottom; logo replaced with bold "TS" monogram in gradient circle.

**Journal form → true full page**: removed `max-w-5xl` side gaps and card chrome wrapper — sections sit on page bg directly. Multi-trade save parallelized via `Promise.allSettled`.

**Plans page**: title upgraded to animated GradientText ("Level Up With TradeSense"); cards get hover lift + indigo glow; trust microcopy row below grid; billing history auto-refreshes after Razorpay payment.

**Instrument filter**: instrument selector now filters groups by selected account's `marketType` (FOREX shows forex/CFDs only, FUTURES shows futures only). Quantity step already enforced per-instrument type.

**"Multiple accounts" selected state**: solid indigo + white text (was washed tint).

**Break-even color**: distinct `bg-info/10 text-info border-info/30` applied across calendar day cells, JournalDayCard, and TradeDetailPage result badge.

**PropFirms page**: removed three Explore navigation cards (All Prop Firms / Discounts / Compare Firms); removed all in-page breadcrumb navs from PropFirmsPage/FirmDetailPage/HubHeader/DiscountsPage. TopBar breadcrumbs are the single source.

Files: `layout/Sidebar.tsx`, `pages/JournalFormPage.tsx`, `pages/PlansPage.tsx`, `components/trades/TradeForm.tsx`, `components/dashboard/TradeCalendar.tsx`, `components/trades/JournalDayCard.tsx`, `pages/TradeDetailPage.tsx`, `pages/PropFirmsPage.tsx`, `pages/FirmDetailPage.tsx`, `pages/DiscountsPage.tsx`, `components/hub/Hub.tsx`

## 2026-08-23 — SelectionBar button order + spacing fix
- Swapped Cancel before Delete (destructive action now last)
- Removed `minWidth: 420px` so bar hugs its content; tightened divider gap `mx-8 → mx-4`
- Applies to every multi-select in the app (shared component)

Files: `ui/SelectionBar.tsx`

## 2026-08-23 — PageHeader rollout + journal page feel + plans premium + sidebar art + topbar crumbs

- **PageHeader rollout**: Accounts, Analytics, Plans, Settings now use animated GradientText headers with personality subtitles (matching Journals/Outlook).
- **Journal form → real page**: X button and outer card chrome removed — sections sit directly on the page bg with sticky footer. Feels like a proper form, not a popup.
- **Plans premium**: hover lift + indigo glow shadow; trust microcopy row ("Cancel anytime · No hidden fees · Secure payments") below grid.
- **Sidebar decoration**: mini CSS candlestick chart + "TradeSense" wordmark in a glass card at the bottom, visible only when expanded. Pure decoration, fills dead space.
- **TopBar breadcrumbs**: detail pages show back chevron + crumb trail (`Home / Prop Firms / Firm Name`) in the left zone. Main pages stay icon-only. Old in-page breadcrumb/back-link markup removed from FirmDetail/TradeDetail/ArticleReader/VideoWatch/TradingTool/CompareFirms.
- **Profile avatar = direct link to /settings** — no dropdown menu on click.
- **Sign out relocated to sidebar very bottom** as a standalone icon button.

Files: `AccountsPage.tsx`, `AnalyticsPage.tsx`, `PlansPage.tsx`, `SettingsPage.tsx`, `JournalFormPage.tsx`, `layout/Sidebar.tsx`, `layout/TopBar.tsx`, `layout/DashboardLayout.tsx`

## 2026-08-23 — Checklists v2 under Journals + funded-path hard-block

- **Checklists moved under Journals**: sidebar Checklist nav item removed; Journals page now has a `Trades | Checklists` tab strip. Checklists tab renders the redesigned **ChecklistsManager** (`components/checklists/ChecklistsManager.tsx`) — template cards with indigo left-accent, rule count badge, first-4 preview, inline builder (add/remove/save per card), long-press batch delete, plan-limit upgrade dialog preserved.
- **Empty state**: "Start from example" seeds a *Pre-Trade Basics* checklist with the classic 5 pre-trade questions.
- `/tags` route retained for backward compat; page itself superseded by the manager.
- **Funded-path hard block**: server trade-create rejects journaling into FUNDED Tradeify Select accounts that haven't chosen Flex/Daily (`fundedPath` in challenge). Client ChallengeInput type extended with `fundedPath`.
- Earlier items in this thread already shipped: calendar hover-tooltip removal, PageHeader on Journals/Outlook.

Files: `pages/TradesPage.tsx`, `components/checklists/ChecklistsManager.tsx` (new), `layout/Sidebar.tsx`, `services/accounts.ts`, `server/services/trade.ts`, `server/services/account.ts`, `routes/index.tsx`, `pages/JournalFormPage.tsx`

## 2026-08-22 — TopBar + manual-form cleanups

- **New `components/layout/TopBar.tsx`**: slim top bar (transparent, no border/box) holding theme toggle, notifications (badge + dropdown panel), and profile menu — moved out of the Sidebar. Panels drop down below their buttons; logout confirm retained.
- **DashboardLayout**: renders TopBar above content; mobile hamburger now lives in the TopBar's left side.
- **Sidebar slimmed**: bottom cluster (theme/bell/profile + border divider) removed along with all its state, effects, handlers, and imports — sidebar is logo-toggle + nav only.
- **AccountFormModal manual section**:
  - "+ Add phase" / remove-phase buttons only for non-catalog setups (custom or no-firm) — catalog picks show exactly the firm's phases
  - Daily loss limit input shows derived breach note: "Soft breach — trading pauses until next session" (futures) vs "Hard breach — account closes immediately" (forex)
  - Trailing lock selector removed (engine defaults: parsed value for catalog, start-lock for custom)
  - Start / Current balance split into two clearly labeled fields (arrow row removed)

Files: `layout/TopBar.tsx` (new), `layout/DashboardLayout.tsx`, `layout/Sidebar.tsx`, `accounts/AccountFormModal.tsx`

## 2026-08-22 — Sidebar logo-toggle + shimmer greeting + entrance animations + calendar fit

- **Sidebar** (`layout/Sidebar.tsx`): hover-reveal and Pin removed — the **logo is now the toggle** (click to expand ⇄ collapse, persisted as `tradesense_sidebar_open`, default open). Mobile close-X retained.
- **Shimmer text** (`Hub.tsx GradientText`): new `animated` prop drives a slow indigo gradient sweep (`.animate-gradient-x`, `gradient-x` keyframes in index.css). Dashboard greeting now renders "Good Afternoon, **{name}**" with the name in the animated gradient.
- **Entrance animations**: shared `lib/motion.ts` (fadeUp + staggerContainer, custom ease). Dashboard staggers header → stat cards → controls → charts → journals; Trades & Analytics pages fade-up on mount. Stat cards stagger individually (Accounts-page feel).
- **Calendar fit + readability** (`dashboard/TradeCalendar.tsx`): day cells `h-24 → h-16 sm:h-20`; weekday header bold uppercase secondary; empty-day contrast raised; week chips label primary; Win/Loss/Flat legend → text-secondary; year-picker panel solid `bg-elevated` with indigo+white selected year. Full month now fits ~1366×768 laptops.

Files: `Sidebar.tsx`, `TradeForm.tsx`, `ui/DateTimePicker.tsx`, `ui/WeekPicker.tsx`, `ui/DateRangePicker.tsx`, `dashboard/TradeCalendar.tsx`, `DashboardPage.tsx`, `TradesPage.tsx`, `AnalyticsPage.tsx`, `Hub.tsx`, `lib/motion.ts` (new), `index.css`

## 2026-08-22 — Indigo theme + light-mode visibility + dropdown sweep + Goat fix

**Theme → Indigo #4F46E5** (user-approved accent swap): all primary/brand tokens + hardcoded purples (`#7C3AED/#8B5CF6/#A78BFA/#5B21B6`, rgba equivalents) mapped to indigo across 16 files; `primary-light` dark = #A5B4FC for readability.
**Selected-state recipe app-wide**: solid `bg-primary` + white text for dropdown selected rows, starting-phase chips, and segmented market buttons (was washed `primary/15` + light-purple text).
**Light theme visibility**: background #F8FAFC→#EDF0F6, borders deepened (#D7DCE5), hover tint #E2E7F0, stronger md/lg shadows, new `[data-theme="light"] .card:hover` ring+shadow rule — hover animations now visible on white.
**Dropdowns**: replaced the last native `<select>`s (AdminPage Code/Rules Automation) with themed `ui/Select` — every dropdown in the app is now the readable custom one.
**Form**: market fallback FOREX→FUTURES (new-form default bug); smart name unblocked for new accounts (`nameTouched` only preset when editing); Auto/Manual toggle stays visible after Type+Size chosen.

**Data**: Goat Funded Trader updated their official docs — 2-Step GOAT Step 2 target **5% → 6%** (verified vs help center, "Updated this week"); seed corrected for all 5 sizes + reseeded.

Files: `index.css`, `AccountFormModal.tsx`, `AdminPage.tsx`, `ui/Select.tsx`, `seed-prop-firms.ts` (+15 files touched by token sweep)

## 2026-08-22 — Catalog truth sweep + manual phase-card wizard

**Critical auto-fill fixes:**
- **Parser**: `parseMoneyValue` now takes whichever marker (`$` or `%`) appears FIRST in the string — previously `%` always won, so texts like `"$600 (increases to $1,000 at 6% profit)"` parsed as 6%-of-size instead of $600 (Tradeify Growth/Lightning DLLs showed target-sized values). Extracted parser into pure `client/src/services/parseRules.ts` (shared client + audit script).
- **Seed gaps**: Stellar Lite 50k/100k/200k rows lacked the "trailing" keyword → were detected STATIC; corrected to `8% trailing — locks to initial balance` (TRAILING/START like their smaller sizes).
- **Reseeded DB** (`npx tsx prisma/seed-prop-firms.ts` — 22 firms updated): corrected catalog now live for both the prop-firm directory page and account auto-fill.
- Audit tooling: `server/scripts/dump-rules.ts` dumps parsed rules for all firm×plan×size rows (179) via seed import guard; verified Tradeify Growth DLL 600/1250/2500/3750 ✓, Stellar Lite all TRAILING ✓, FTMO/The5ers/Goat/Aqua/FTP/MFF/E8 FX spot-checked against official numbers.

**Manual mode phase-card wizard (`AccountFormModal.tsx`):**
- Flat target row replaced by **per-phase highlighted cards** — each card shows its phase chip ("Phase N · start here" when selected as start), remove button, full-width target input; "+ Add phase" up to 3
- **Instant/direct plans** (plan name matches /instant|direct/i): starting phase auto-set FUNDED, phase chips+cards hidden, success-styled "No profit target" note, Loss Limits card only, drawdown/trailing still shown
- Market default → **FUTURES**
- Type+Size pickers **always visible** once a catalog firm is picked (auto-locked included); changing either re-applies that plan's rules instantly
- Size options show plain size (`25k`) without price

Files: `AccountFormModal.tsx`, `services/accounts.ts`, `services/parseRules.ts` (new), `server/scripts/dump-rules.ts` (new), `server/prisma/seed-prop-firms.ts`

## 2026-08-22 — Popup rendering fix + form picker bugs

- **Confirmation popups looked "broken"** — root cause: `.card` uses `backdrop-filter: blur(12px)`, which makes it the containing block for `fixed` descendants, so ConfirmDialog/add-firm Modal rendered trapped inside the form panel (clipped, odd background). `ui/Modal.tsx` and `ui/ConfirmDialog.tsx` now render via `createPortal(document.body)` — always viewport-anchored, correct stacking app-wide. Stacked overlay softened `bg-black/50` → `bg-black/40`.
- **Size picker vanished when picking a Type** — Type onChange auto-selected the first size, instantly flipping the auto-lock which collapsed the `[Type | Size]` row before it could be seen. Removed auto-pick: Size stays visible with placeholder until explicitly chosen; switching Type resets Size.
- **Manual rule fields showed while in Automatic mode** (before Type+Size picked) — `showManualFields` now requires manual context: catalog firms show fields only after both picks; custom firms always show them.

Files: `ui/Modal.tsx`, `ui/ConfirmDialog.tsx`, `AccountFormModal.tsx`

## 2026-08-22 — Form flow rework + custom prop firms + confirmations

**Account form (`AccountFormModal.tsx` rewritten):**
- Split combined dropdown into side-by-side `[Account Type]` `[Size]` selects; picking a Type auto-selects its first Size; Size labels show price (`50k · $87`)
- Manual mode now **prefilled from catalog** — rule application fires on Type+Size selection in both modes; values stay editable
- "Daily loss breach" selector removed everywhere — auto-derived (futures = soft pause / forex = hard fail); shown read-only in Auto summary card
- Smart name: defaults `{Firm} {Size} {Plan}` (e.g. "Tradeify 50k Growth Evaluation"), dedupes against existing accounts ("… 2", "… 3"), stops regenerating once user types; editable in both modes
- Confirmations via web-styled ConfirmDialog: Cancel → "Discard changes?" (only when dirty), Save Changes → "Apply changes?"
- **Removed "Set up manually"** → new **"New firm"** button beside the picker opens a themed mini-modal (Name*, Market*, website) creating a server-persisted custom firm; custom firms show "(custom)" suffix, are owner-only, and **force Manual mode** (Auto disabled — no catalog rules)

**Server:**
- `schema.prisma`: `PropFirm.createdByUserId String?` (+ `prisma db push`, client regenerated)
- `POST /api/v1/prop-firms` (authenticated) — creates user-owned custom firm, rejects duplicate catalog names, slug collision-safe
- `GET /api/v1/prop-firms` — returns global catalog + caller's own custom firms

**Dropdown readability (app-wide):**
- `ui/Select.tsx`: solid `bg-elevated` panel (no translucency/blur), option text full `text-text-primary`
- Global CSS: native `<select>` options render dark-panel/light-text; `color-scheme: dark` on dark theme

**Wiring:** `AccountsPage` passes `accounts` (name dedupe) and `onFirmCreated` (live picker update).

Files: `AccountFormModal.tsx`, `AccountsPage.tsx`, `ui/Select.tsx`, `index.css`, `services/propFirms.ts`, `routes/propFirm.ts`, `controllers/propFirm.ts`, `schema.prisma`, `package.json`

## 2026-08-22 — Fully-automated account form + detail modal fixes + typography

**Auto/Manual form rework (`AccountFormModal.tsx` rewritten):**
- **Auto = zero-entry**: Market → Firm → Account Type → name only. Read-only "Rules applied automatically" summary card (size · targets · max loss+type · DLL+breach · lock). No phase chips/balances/override on creation; edit-mode keeps balances editable with locked summary (lastAppliedType guard prevents catalog re-apply clobbering restored values).
- **Manual = validated**: required fields with inline red errors — every phase target > 0 (max 3, add/remove builder), max total loss, daily loss limit (`0 = none` helper), start/current balance, name. Funded start hides target/drawdown fields, shows payout hint.
- Starting-phase chips render only phases the account actually has (+ Funded); fixed always-"Phase 1" bug by deriving count from parsed targets (dead `planSteps` code removed).

**Detail modal (`AccountDetailModal.tsx`):**
- Close X/Esc/overlay now closes directly (confirmation removed); Reset keeps its confirm.
- "Set status…" dropdown removed from footer.
- Pipeline redesign: ✓ green passed · ✗ red failed (failed account's current phase) · ● pulsing current · ○ upcoming · FUNDED ✓ appended when funded.

**Layering & blur:** `ui/Modal` gained `zIndex` prop — form opens `z-[70]` **in front of** detail modal; `ConfirmDialog` → `z-[80]`; `backdrop-blur-sm` removed from Modal, ConfirmDialog and both AccountsPage delete-dialog overlays.

**Typography & contrast:** self-hosted Inter via `@fontsource-variable/inter` (Google Fonts CDN link removed from `index.html`); dark `text-muted #8A8A99→#A3A3B5`, `text-secondary #B4B4C5→#C0C0D0`; dimmed `/50–/70` muted-text usages raised in `AccountCard.tsx` + `AccountsPage.tsx`.

Files: `AccountFormModal.tsx`, `AccountDetailModal.tsx`, `AccountsPage.tsx`, `ui/Modal.tsx`, `ui/ConfirmDialog.tsx`, `index.css`, `index.html`, `services/accounts.ts`, `package.json`

## 2026-08-20 — Account form redesign: Prop firm selection overhaul

Complete redesign of the account creation/edit form with a streamlined prop firm selection flow:

- **Prop firm selection**: Replaced searchable firm cards with simple Select dropdown (consistent with "Daily loss breach")
- **Auto/Manual mode toggle**: After firm selection, users choose between:
  - **Auto mode**: Pick account type (Plan — Size) from dropdown, rules pre-filled from catalog (editable with "Override rules" checkbox)
  - **Manual mode**: Empty editable rules for custom configurations
- **Funded phase handling**: When starting phase is "FUNDED", challenge rule fields (phase targets, drawdown, daily loss, etc.) are hidden; only balance fields remain
- **Starting phase selector**: Now uses dynamic phase chips based on selected plan's step count (auto mode) or phase targets count (manual mode)
- **Challenge rules read-only in auto mode**: Auto-filled rules are read-only with "Override rules" checkbox to enable editing
- **Duplicate parameter cleanup**: Fixed duplicate `setFirmMode`, `setSelectedAccountType`, `market` props in PropFirmSection
- **Type safety**: Added explicit types to map callbacks, added `planSteps` to `PropFirmPlan` interface, added `disabled` prop to Select component

## 2026-08-20 — New Account Form: Prop Firm Selection + Manual/Auto Mode

**All seed data corrected to match official firm help centers/websites:**

- **Tradeify** — Fixed DLL amounts/presence: Growth has DLL on eval+funded ($600/$1,250/$2,500/$3,750, increases at 6% profit); Select Flex no DLL, Select Daily has DLL ($500/$1,000/$1,250/$1,750); Lightning has DLL ($600/$1,250/$2,500/$3,000, increases at 6%); all EOD trailing locks at $100 above start
- **Lucid Trading** — All 4 plans (Pro/Flex/Daily/Direct) corrected from TRAILING to **EOD_TRAILING** with lock at $100 above start (official: "End of Day Drawdown", MLL rises with closing balance)
- **FundedNext Futures** — All 4 plans (Rapid Pro/Daily/Flex/Legacy) corrected from EOD_TRAILING to **TRAILING with START lock** (max loss % of initial, increases with profits, locks at initial + $100 after 1st payout)
- **FundedNext USD (Forex)** — All plans (Stellar 2-Step/1-Step/Lite/Instant) corrected to **TRAILING with START lock** (locks at initial balance)
- **Goat Funded Trader (Forex)** — Corrected from % trailing to **STATIC max loss + EOD daily drawdown**: 1-Step = 6% static / 4% EOD; 2-Step GOAT/Standard/Pro = 10% static / 4-5% EOD
- **Goat Funded Futures** — Split correctly: EOD Challenge/Flex = **EOD_TRAILING**; Sprint/Instant = **TRAILING (intraday %)**
- **The5ers** — Corrected from 10%/5% to **6% static max loss / 3% EOD daily drawdown** (current website pricing)
- **FTMO** — Verified correct (STATIC 10% max loss, 5% daily loss)
- **Take Profit Trader** — Verified: Test = EOD_TRAILING; PRO = TRAILING (intraday); PRO+ = EOD_TRAILING
- **Apex Trader Funding** — Verified: Intraday Trail = no max DD (equity only); EOD Trail = EOD_TRAILING + DLL

## 2026-08-19 — Account detail modal fixes + blown-accounts log

Replaced the generic card grid with a terminal-style prop-firm dashboard look.

- `client/src/components/accounts/ProgressDial.tsx` (new) — SVG circular phase dial: gradient progress arc toward phase target, per-step tick marks, glowing balance dot, % to target in center ("PAID" 100% state when funded).
- `client/src/components/accounts/AccountCard.tsx` — full visual rewrite (same props API): firm-color top bar + signal dots, count-up LED balance readout (font-mono), pulsing-endpoint equity sparkline, dial, restyled floor-track with danger zone, status stamps (blinking "SESSION PAUSED — resumes HH:MM" banner, rotated "BLOWN" watermark, "PAID $X" chip), footer ticker strip (BAL/TGT/DLL/W·L/TR), firm-color hover glow.
- `client/src/hooks/useCountUp.ts` (new) — rAF ease-out count-up hook shared by card and hero.
- `client/src/pages/AccountsPage.tsx` — terminal hero band (LIVE indicator, count-up total equity, today's P&L, status chips), auto-scrolling status marquee (pause on hover), 2-column large-panel grid with framer-motion stagger, favorites first, terminal-style "NO CONNECTIONS" empty state.
- `client/src/index.css` — `.ticker-track` marquee keyframes (45s loop, pause on hover).

## 2026-08-19 — Challenge Engine + NYK Clock + Accounts redesign

Prop-firm challenge simulation driven by journaled trades on a DST-aware New York trading-day clock (6 PM → 5 PM NY sessions), plus a redesigned Accounts page.

**Server**
- `server/prisma/schema.prisma` — Account + `status` (ACTIVE/DAILY_PAUSED/PASSED/FAILED/FUNDED) + `pausedUntil`; new `AccountEvent` and `AccountDaySnapshot` models.
- `server/src/utils/nykTime.ts` (new) — DST-aware America/New_York session helpers via Intl.
- `server/src/services/accountEngine.ts` (new) — deterministic replay of completed trades grouped by NY session: balance, phase transitions (fresh account on advance), drawdown floors (STATIC / EOD_TRAILING / TRAILING), trailing lock (START / START+$100), soft DLL breach → DAILY_PAUSED auto-resume at next session, hard max-loss fail, events + day snapshots (idempotent rewrite), payout handling.
- `server/src/services/account.ts` — rules parsing v2 (drawdown type/lock/DLL from rule text), challenge config on create/update (marketType, startingPhase, phaseTargets, maxTotalDrawdown, maxDailyDrawdown, dllBreach, trailingLock), `resetAccount`, `getChallengeProgress` v2 (legacy fields kept), statuses include DAILY_PAUSED.
- `server/src/services/trade.ts` — trade CRUD reconciles via engine instead of syncAccountBalance; daily trade-limit window uses NY sessions.
- `server/src/controllers/accountController.ts` — `POST /accounts/:id/reset` route.
- `server/prisma/reconcile-accounts.ts` (new) — backfill script for existing accounts.

**Client**
- `client/src/services/accounts.ts` — ChallengeProgress v2 types, `resetAccount`, challenge payloads on create/update, client-side `parsePropRules` for auto-fill preview.
- `client/src/components/accounts/AccountFormModal.tsx` (new) — one merged create/edit form: Type → Market → firm picker (search) → plan → size → starting phase → editable rules card (phase targets, drawdown type, max loss, DLL, breach behavior, trailing lock, balances) → name. Auto-fills from catalog, fully editable for manual setup.
- `client/src/components/accounts/AccountCard.tsx` (new) — firm accent, favorite, status pill, phase pipeline, equity sparkline, floor⇠balance→target drawdown gauge with danger zone, W·L chips, payout chip, hover actions, long-press batch select.
- `client/src/components/accounts/AccountDetailModal.tsx` (new) — phase stepper, stats, target/drawdown progress bars, equity AreaChart, rules, daily snapshot table with breach badges, event timeline, payouts, status override, challenge reset.
- `client/src/pages/AccountsPage.tsx` — rewritten as stats strip + card grid + detail modal; kept delete/batch-delete/upgrade flows.
- `client/src/components/trades/TradeForm.tsx` — DAILY_PAUSED accounts excluded from trade targets; status chip shows Paused/Failed/Funded.


## 2026-08-23 - Trade edit full-page fix
- **TradeEditPage**: passed noFrame to TradeForm so edit renders as full-page inline form (was painting itself as fixed inset-0 popup overlay)
- **TradeDetailPage**: removed dead showEdit state + inline TradeForm block + unused imports (TradeForm, toast, initialForm)

Files: pages/TradeEditPage.tsx, pages/TradeDetailPage.tsx

## 2026-08-23 - DateTimePicker panel visibility fix
- Changed picker trigger from div to real button element so click focuses it, activating .card:focus-within z-index lift (same mechanism Select uses) - calendar/time panel no longer buried under next section

Files: ui/DateTimePicker.tsx

## 2026-08-23 - Futures instrument filter + integer-only quantity
- FUTURES accounts now exclude CFDs and Forex instrument groups (Suggested list included NAS100/US100 CFDs before)
- Quantity on futures accounts/instruments: integer-only (step=1, min=1, parseInt, blocks . e E + - keys) - applies to main qty and partial closes, gated by account marketType

Files: components/trades/TradeForm.tsx

## 2026-08-23 - Merged Trade Window range picker + context-aware breadcrumbs
- New ui/DateTimeRangePicker: single field (entry -> exit), Entry/Exit tabs, shared calendar, both time rows visible; clamps exit >= entry both directions; day click applies to active segment preserving time; save validation fallback
- Fixed TimeRow remount bug (was defined inside parent causing remount churn + interval leaks); moved to top-level with unmount cleanup
- lib/breadcrumbs.tsx: BreadcrumbProvider + useCrumbs hook; TopBar renders context override with getCrumbTrail fallback
- Dynamic trails: trade detail "Journals / Jul 14 Journal", edit "Journals / Jul 14 Journal / Edit" (middle links to detail), firm page "Prop Firms / Futures|Forex / {Firm Name}"
- Verified in browser via Playwright: all clamp rules, day pick, and three breadcrumb trails

Files: ui/DateTimeRangePicker.tsx, lib/breadcrumbs.tsx, components/trades/TradeForm.tsx, layout/TopBar.tsx, routes/index.tsx, pages/TradeDetailPage.tsx, pages/TradeEditPage.tsx, pages/FirmDetailPage.tsx

## 2026-08-23 - DateTimePicker panels portaled to body (stacking fix)
- Range picker + single picker panels now render via createPortal(document.body) with fixed positioning - no longer trapped by .card backdrop-filter stacking context (Trade Story section was painting over the calendar)
- Flip above trigger when viewport bottom is tight; reposition on scroll/resize; outside-click closes; z-[70] above SelectionBar
- Verified via screenshot: panel floats above all sections, full calendar + both time rows visible

Files: ui/DateTimeRangePicker.tsx, ui/DateTimePicker.tsx

## 2026-08-24 - Trade Window 3-step wizard + prop-firm Compare removed
- DateTimeRangePicker rewritten as wizard: Step 1 Entry day -> Step 2 Exit day (entry highlighted, earlier click restarts range) -> Step 3 times (Entry/Exit steppers, Change dates back). Smart open step (none->1, entry-only->2, both->3). Range highlight, same-day exit>=entry clamp kept
- Removed prop-firm Compare: deleted FirmDetailPage compare link, /prop-firms/compare route, CompareFirmsPage.tsx; added explicit redirect /prop-firms/compare -> /prop-firms (was leaking into :kind route with broken hero)
- Verified in browser: full wizard flow 1->2->3 with range Jul 16 -> Jul 18, compare link gone, compare URL redirects

Files: ui/DateTimeRangePicker.tsx, pages/FirmDetailPage.tsx, routes/index.tsx, pages/index.ts, deleted pages/CompareFirmsPage.tsx

## 2026-08-24 - Hard-block exit before entry (dates + times)
- Step 2 Exit-day calendar: days before entry day disabled (grayed, unclickable) - removed earlier-click restart behavior
- Step 3 same-day: Exit time floor = entry time - hour-down chevron disabled at entry hour, minute-down disabled at entry minute when hour matches, typing below floor clamps up; floor releases automatically when exit hour > entry hour
- Verified via Playwright: days 1-15 disabled with entry Jul 16; typing 08 -> 10; minute-down blocked at :15 floor then released at hour 11

Files: ui/DateTimeRangePicker.tsx

## 2026-08-24 - FIX: all Trade Window chevrons fired minute-down (shared fnRef)
- ROOT CAUSE: TimeRow's makeHold wrote every button's handler into ONE shared fnRef - last assignment (minute-down) won, so hour-up/down and minute-up ALL executed minute-down. Matches user report exactly ("only decrease min works")
- FIX: per-button keyed refs (fnsRef.current[key]) - each chevron now runs its own handler, hold-to-repeat uses latest fn for that key
- Also hardened today-ceiling: hour cap = current hour when trade dated today, minute cap = current minute at that hour; up-chevrons disable at ceiling (mirror of floor); typing clamps into [floor, ceiling] both directions
- Verified via Playwright: entry hUp 10->11 (exit auto-pushed 11:05->11:15), mUp, hDown, mDown, exit hUp/mUp all correct; floors disable at exit==entry; disableFuture=true confirmed at runtime

Files: ui/DateTimeRangePicker.tsx

## 2026-08-25 - Full site QA sweep (179 accounts, 555 journals) + 3 engine bugs fixed
- QA: wiped demo data; bulk-created every plan x size for 14 active firms (179 accounts); injected 3 scripted journals each via API; 3 UI journal flows with local chart images (upload, gallery, persistence, Ctrl+V paste all verified); full drawdown matrix tested (Static/Trailing/EOD/START-lock x forex/futures); page sweep 12 pages desktop + 4 mobile - zero console errors, zero failed requests, no horizontal overflow
- FIX 1 (critical): accounts with no max-drawdown rule (all Instant funding) crashed journal creation - engine floor -Infinity not persistable; now null-safe (accountEngine.ts) + AccountDaySnapshot.floor Float? in schema
- FIX 2 (high): compound max-loss rules "2% daily trailing / 5% overall trailing" parsed the DAILY % as max drawdown; parsers now prefer the overall value (server parseTarget + client parseMoneyValue); refreshed dv for 20 affected Goat FX accounts
- FIX 3 (critical): phase-advance replay non-idempotent - reconcile re-applied trades on already-advanced phaseIndex, balance runaway ( on 50k acct); engine now replays from immutable dv.startPhaseIndex (set at create/update, backfilled 179 accounts)
- Scenario results: DLL forex=FAILED, DLL futures=DAILY_PAUSED, hard breach=FAILED, 1-step target=FUNDED, 2-step target=PHASE2, reconcile idempotent - all PASS
- QA tooling: server/scripts/qa-lib.mjs, qa-sweep.mjs, qa-verify.mjs, qa-scenarios.mjs, qa-refresh-dv.mjs, qa-backfill-startphase.mjs, qa-wipe-trades.mjs
