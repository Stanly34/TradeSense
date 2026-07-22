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
