# ClaimGuard AI — Project Retrospective

> **Purpose:** Running log of all work done on this project. Claude must read this before starting any task and update it immediately after completing any task.

---

## Project Identity

- **App name:** Vindica (previously "ClaimGuard AI" — fully rebranded to Vindica)
- **Stack:** Next.js 16 (App Router, TypeScript), Tailwind v4, NextAuth v5, Prisma 7, PostgreSQL, Anthropic Claude API, shadcn/ui, Recharts
- **Working directory:** `/c/Users/malad/dev/dental-denial`
- **Dev server:** http://localhost:3000
- **Demo login:** demo@claimguard.ai / demo1234

---

## Completed Work

### 2026-04-25 — Vercel Auth Loop Fix

- **`session.maxAge` raised** (`lib/auth.ts`) — changed 900 s (15 min) to 86400 s (24 h).
- **`debug-auth` endpoint deleted** (`app/api/debug-auth/route.ts`) — unauthenticated endpoint exposing bcrypt result, user role, and user ID; removed as critical info-disclosure risk.
- **Env var checklist for Vercel** — see root cause notes below.

**Root cause of 307 login loop on Vercel:**
1. `AUTH_SECRET` (not `NEXTAUTH_SECRET`) must be set — NextAuth v5 uses `AUTH_SECRET`.
2. `NEXTAUTH_URL` must be set to the exact production URL so cookie domain is correct.
3. `DATABASE_URL` must point to a cloud Postgres instance, not `localhost`.

### 2026-04-19 — Full Security & Code Quality Remediation

Comprehensive audit and fix of 30+ issues across four severity tiers. TypeScript compiles clean (`npx tsc --noEmit` passes).

**Tier 1 — Critical:**
- **XSS fixed** (`app/(dashboard)/appeals/[id]/page.tsx`) — `downloadPDF()` now HTML-escapes `letterContent` and `patientName` before `document.write()`.
- **IDOR fixed** (`app/api/providers/[id]/events/route.ts`) — GET and POST now verify the provider belongs to the requesting user's practice.
- **Mass assignment fixed** (`app/api/appeals/[id]/route.ts`) — PATCH body is now whitelisted to `['status', 'submittedAt', 'resolution', 'resolvedAt', 'amountRecovered']`.
- **Hardcoded personal email removed** (`app/api/test/notifications/route.ts`) — replaced with `process.env.DEMO_EMAIL`; dead code `void emailModule` removed.

**Tier 2 — High:**
- **`isOwnerAccount` email gate removed** (`app/(dashboard)/settings/page.tsx`) — `AIModelCard` now gated by `isSuperAdmin` role.
- **Practice member authorization fixed** — `app/api/appeals/route.ts`, `app/api/appeals/[id]/route.ts`, `app/api/claims/[id]/analyze/route.ts`, `app/api/appeals/[id]/generate/route.ts` all now look up the user's practice via `OR: [userId, member]` and compare `practiceId` rather than checking `practice.userId === session.user.id` (which blocked all non-owner members).
- **Zod validation added** to 5 API routes: `auth/register`, `users` POST, `month-end/[id]/items`, `month-end/[id]/notes`, `providers/[id]/credentials` POST + PUT.
- **Prompt injection hardened** (`lib/ai/claim-analyzer.ts`) — added `s()` sanitizer stripping control chars and injection-like tag sequences from all user-controlled fields; data wrapped in `[CLAIM DATA START/END]` delimiters.
- **payerId whitelist** (`lib/knowledge/context-builder.ts`) — `buildPayerSection()` now validates `payerId` matches `/^[A-Z0-9_\-]{1,50}$/i` before using it as an object key.
- **Rate limiting applied** to both AI endpoints — `analyze`: 10/min, `generate`: 5/min (uses existing in-memory `isRateLimited`; TODO: Redis-backed for multi-instance).
- **Zod output validation** on Claude responses (`lib/ai/claim-analyzer.ts`) — `ClaimAnalysisSchema` validates all fields including `denialRiskScore` range (0–100) and enum values.

**Tier 3 — Medium:**
- **Null-practice ownership bypass fixed** — all ownership checks now use strict equality on `practiceId` (no optional chaining that silently passed on null).
- **Demo email fallback removed** (`lib/auth.ts`) — extended sessions only activate when `DEMO_ACCOUNT_EMAILS` env var is explicitly set (no hardcoded fallback list).
- **Real pagination** (`lib/db/claims.ts`) — `listClaims()` now returns `{ claims, total }` with `limit`/`offset` params (default 50, max 100); API route and `ClaimsListView.tsx` updated; `dashboard/page.tsx` destructures new shape.
- **Race condition fixed** (`app/(dashboard)/claims/[id]/page.tsx`) — `useEffect` now uses `cancelled` flag to prevent stale updates.
- **Resolution modal error feedback** (`app/(dashboard)/appeals/[id]/page.tsx`) — error state displayed inline when PATCH fails.

**Tier 4 — Low / Cleanup:**
- **ENCRYPTION_KEY test-mode bypass removed** (`lib/security/encrypt.ts`) — validation runs unconditionally; tests must set a valid 32-byte key.

**Secrets requiring rotation before production:**
- `NEXTAUTH_SECRET` (currently placeholder value)
- `CRON_SECRET` (currently `vindica-cron-secret-2026`)
- Add `DEMO_EMAIL=<your-email>` if test notifications endpoint is needed

---

### 2026-04-04 — National Denial Benchmarks + Practice/National Tab Toggle

- **`NationalBenchmark` Prisma model** — new table with `year`, `quarter`, `source`, `data Json`, `publishedAt`; unique on `[year, quarter]`. Migration: `add_national_benchmarks`.
- **Seeded 8 quarters** of national data (2023 Q3 – 2025 Q2) in `prisma/seed.ts`, using ADA HPI + NADP Annual Dental Benefits Report figures. Each quarter has: `overallDenialRate`, `prevQuarterDenialRate`, `appealWinRate`, `avgProcessingDays`, `denialsByReason`, `denialsByPayerType`, `denialsByProcedureCategory`.
- **`app/api/analytics/national/route.ts`** — GET (any authenticated user): returns last 8 quarters as `{ latest, trend }`. POST (SUPER_ADMIN only): upserts a new quarterly snapshot.
- **`components/denial-trends/NationalBenchmarksView.tsx`** — new component: 4 metric cards (denial rate QoQ trend, appeal win rate, avg processing days, data period/source), quarterly trend LineChart with 5% reference line, denial rate by payer BarChart + table, denial by reason Pie/donut + overturn rate table, procedure category horizontal BarChart, source footnote.
- **`DenialTrendsDashboard.tsx`** — added segment control toggle ("My Practice" / "National Benchmarks") at top; lazy-fetches national data on first switch to National view (cached in state); date range filter hidden in National view. Practice view unchanged.
- **Quarterly update mechanism**: SUPER_ADMIN calls `POST /api/analytics/national` to add each new quarter. No external API polling.

### 2026-04-03 — SUPER_ADMIN Route Coverage (Complete)

- **Added `SUPER_ADMIN` to all API `protect()` calls** — bulk-replaced all `['ADMIN']` and `['ADMIN', 'OFFICE_MANAGER']` patterns across 29 `protect()` call sites in `app/api/**/*.ts`. SUPER_ADMIN now has access to every admin-gated endpoint.
- **Fixed all practice lookups** — replaced every `prisma.practice.findUnique({ where: { userId } })` in API routes with `findFirst({ where: { OR: [{ userId }, { members: { some: { id: userId } } }] } })`. This ensures SUPER_ADMIN users who are practice members (not just owners) can access practice-scoped data. 16 occurrences updated across: `claims/route.ts`, `analytics/denials/route.ts`, `appeals/route.ts`, `practice/route.ts`, `providers/route.ts`, `providers/[id]/route.ts`, `users/route.ts`, `users/[id]/route.ts`, `settings/notifications/route.ts`, `month-end/route.ts`.

### 2026-04-02 — Global AI Model Setting (SUPER_ADMIN only)

- **Added `SystemConfig` Prisma model** (`key String @id, value String, updatedAt, updatedBy`) for system-wide key/value settings.
- **`lib/system-config.ts`** — `getGlobalAIModel()` reads `ai_model` key from DB (falls back to `DEFAULT_AI_MODEL`); `setGlobalAIModel()` upserts.
- **`app/api/system/config/route.ts`** — GET (all authenticated users, returns `{ aiModel }`); PATCH (SUPER_ADMIN only, validates against `AI_MODELS` list).
- **API routes now ignore client-supplied model**: `/api/claims/[id]/analyze` and `/api/appeals/[id]/generate` both call `getGlobalAIModel()` from DB — the client body `model` field is no longer read or trusted.
- **`AIModelCard`** now fetches from API on mount; shows read-only view with Lock icon for non-SUPER_ADMIN; SUPER_ADMIN can click to change (saves via PATCH immediately).
- **Cleaned up**: removed `getStoredModel()` import and usage from `claims/[id]/page.tsx` and `appeals/[id]/page.tsx`.
- **Also (same session)**: set `demo@claimguard.ai` to `SUPER_ADMIN`; backfilled `practiceId` on 43 existing audit log records.
- **Note**: after every `prisma migrate dev`, must also run `npx prisma generate` manually — the config does not auto-generate in this setup.

### 2026-04-02 — Two-Tier Audit Log System

- **Added `SUPER_ADMIN` role** to Prisma `Role` enum and `lib/auth/roles.ts`. `huseynaghayev61@gmail.com` (Huseyn) was set to `SUPER_ADMIN` in the DB directly.
- **Schema migration** `add_super_admin_and_audit_fields`: added `practiceId String?`, `userAgent String?` to `AuditLog`; new indexes on `[practiceId, timestamp]` and `[userId, timestamp]`; added `PHI_ACCESS`, `EXPORT`, `MFA_CHANGE`, `USER_CREATED`, `USER_DEACTIVATED` to `AuditAction` enum; added `auditLogs AuditLog[]` back-relation on `Practice`.
- **`lib/audit.ts`** — `writeAuditLog()` now accepts optional `practiceId` and `userAgent` params (backward-compatible).
- **New API routes:**
  - `app/api/audit/route.ts` — practice-scoped, ADMIN+, paginated 25/page, CSV export
  - `app/api/audit/system/route.ts` — SUPER_ADMIN only, cross-practice, includes practice name column + userAgent
- **New UI:**
  - `components/settings/AuditLogTable.tsx` — shared client component: filters (date, action, email, practiceId for system), pagination, CSV export button, action color badges
  - `components/settings/SettingsSubNav.tsx` — horizontal tab nav: General / Audit Log (ADMIN+) / System Audit (SUPER_ADMIN only with "SYSTEM" pill badge)
  - `app/(dashboard)/settings/layout.tsx` — wraps all /settings/* pages with the sub-nav
  - `app/(dashboard)/settings/audit-log/page.tsx` — practice tier (redirects to /settings if not ADMIN)
  - `app/(dashboard)/settings/audit-log/system/page.tsx` — calls `notFound()` for non-SUPER_ADMIN (clean 404, does not reveal page exists)
- **`settings/page.tsx`** — removed old Audit Logs tab; updated `isAdmin` check to include `SUPER_ADMIN`.
- **Sidebar** (`components/layout/Sidebar.tsx`) — `ALL_ROLES` and `NON_PROVIDER` arrays updated to include `SUPER_ADMIN`.

### 2026-03-31 — Fix Login: localhost → 127.0.0.1 (IPv6 Resolution Bug)

- **Root cause:** On Windows, `localhost` resolves to `::1` (IPv6) but Docker PostgreSQL only binds to `0.0.0.0:5432` (IPv4). All `pg` connections from the Node.js process (Next.js dev server) were getting `ECONNRESET`, causing Prisma P1017 "Server has closed the connection" errors on every DB query, making login return "Internal server error".
- **Fix:** Changed all three connection string occurrences from `localhost` → `127.0.0.1`:
  - `.env.local`: `DATABASE_URL="postgresql://postgres:password@127.0.0.1:5432/claimguard"`
  - `prisma.config.ts`: fallback URL updated to `127.0.0.1`
  - `lib/db/index.ts`: fallback URL updated to `127.0.0.1`
- **Rule:** Always use `127.0.0.1` not `localhost` for Docker database connections on Windows.
- **Verified:** `POST /api/auth/credentials-check` returns `{"userId":...,"email":"demo@claimguard.ai","mfaEnabled":true}` successfully.

### 2026-03-31 — 2FA Email Override for Demo Account

- **app/api/auth/send-mfa/route.ts** — added demo-account redirect: when `user.email === 'demo@claimguard.ai'`, the 2FA code is delivered to `huseynaghayev61@gmail.com` instead. All other accounts receive codes at their own login email. No schema changes made.

### 2026-03-15 — Full MVP Build (Phases 1–6)

**Phase 1 — Foundation**
- Initialized Next.js 16.1.6 project with TypeScript, Tailwind v4, ESLint, App Router
- Installed all dependencies: Prisma 7, NextAuth v5 beta, @anthropic-ai/sdk, shadcn/ui, Recharts, Zod, react-hook-form, bcryptjs, date-fns, etc.
- Created `prisma/schema.prisma` with full data model: User, Practice, Claim, Appeal, Payer, and all enums
- Created `.env.local` and `.env.example`
- Created `lib/db/index.ts` — Prisma singleton with `@prisma/adapter-pg`
- Created `lib/auth.ts` — NextAuth v5 credentials provider with bcrypt password verification
- Created `proxy.ts` (replaces `middleware.ts` — Next.js 16 convention) for route protection
- Created `app/api/auth/[...nextauth]/route.ts`
- Created `app/api/auth/register/route.ts` — user + practice creation in one transaction
- Created `types/index.ts` — shared TypeScript interfaces (ClaimInput, ClaimAnalysis, PayerData, etc.)
- Created `lib/constants.ts` — CDT codes, plan types, denial reasons, color maps
- Created `lib/utils.ts` — cn, formatCurrency, formatDate, getRiskColor, getRiskLevel

**Key compatibility fixes applied:**
- Prisma 7: moved datasource URL to `prisma.config.ts` (new `defineConfig` API); installed `@prisma/adapter-pg` + `pg`
- shadcn v4: `toast` deprecated, replaced with `sonner`
- Next.js 16: middleware renamed to `proxy.ts` with `proxy` named export; uses `getToken` from `next-auth/jwt` to avoid Prisma in Edge runtime

**Phase 2 — Layout & Shell**
- Created `app/globals.css` — Google Fonts (DM Sans), CSS variables, Tailwind base
- Created `app/layout.tsx` — root layout with metadata
- Created `app/page.tsx` — redirects to `/dashboard`
- Created `components/layout/Sidebar.tsx` — sidebar with Lucide icons and active state
- Created `components/layout/Header.tsx` — top bar with signout button
- Created `app/(dashboard)/layout.tsx` — dashboard shell with sidebar
- Created `app/(auth)/login/page.tsx` — login form
- Created `app/(auth)/register/page.tsx` — registration form
- Created `components/claims/DenialRiskBadge.tsx` — color-coded risk badge
- Created `components/appeals/AppealStatusBadge.tsx`

**Phase 3 — Core Data Pages**
- Created `app/(dashboard)/claims/page.tsx` — claims table with status/risk/search filters, skeleton loading, action buttons
- Created `app/(dashboard)/claims/new/page.tsx` — multi-section form: patient info, payer selection, CDT code multi-input (up to 15), diagnosis codes, documentation checklist; auto-triggers AI analysis on submit
- Created `app/(dashboard)/claims/[id]/page.tsx` — two-column layout: claim summary + AI analysis panel, denial modal, appeal generation flow

**Phase 4 — AI Engine**
- Created `lib/ai/prompts.ts` — system prompts for claim analyzer, appeal generator, CDT optimizer
- Created `lib/ai/claim-analyzer.ts` — calls Claude, returns structured JSON risk assessment with graceful degradation on failure
- Created `lib/ai/appeal-generator.ts` — generates 400–700 word professional appeal letters, payer-specific
- Created `lib/ai/cdt-optimizer.ts` — CDT code optimization suggestions
- Created `app/api/claims/route.ts` — GET (list with filters) + POST (create)
- Created `app/api/claims/[id]/route.ts` — GET single + PATCH
- Created `app/api/claims/[id]/analyze/route.ts` — runs AI analysis, stores results back to DB
- Created `app/api/appeals/route.ts` — GET list + POST (create appeal, set claim to APPEALING)
- Created `app/api/appeals/[id]/route.ts` — GET single + PATCH
- Created `app/api/appeals/[id]/generate/route.ts` — calls appeal-generator AI, updates letter content
- Created `app/api/payers/route.ts` — GET all payers
- Created `prisma/seed.ts` — demo user (demo@claimguard.ai / demo1234), 8 payers with realistic intelligence, 15 sample claims across all statuses, 3 pre-written appeal letters

**Phase 5 — AI UI**
- Created `components/claims/ClaimAnalysisPanel.tsx` — SVG risk gauge (animated), expandable risk factors accordion, CDT code review table, missing docs checklist, payer warnings callout, numbered recommended actions
- Updated `app/(dashboard)/claims/[id]/page.tsx` — integrated ClaimAnalysisPanel, denial modal, appeal generation button

**Phase 6 — Intelligence & Polish**
- Created `app/(dashboard)/appeals/page.tsx` — appeals list with win-rate stats, total recovered revenue
- Created `app/(dashboard)/appeals/[id]/page.tsx` — appeal letter editor (textarea), regenerate/copy/print/submit/resolve actions, resolution modal
- Created `app/(dashboard)/payers/page.tsx` — payer intelligence table with expandable rows (denial reasons, pre-auth codes, documentation tips)
- Created `app/(dashboard)/settings/page.tsx` — settings stub
- Created `app/(dashboard)/dashboard/page.tsx` — async server component loading real KPI data from DB
- Created `components/dashboard/DashboardClient.tsx` — KPI cards (4), denial trend line chart (Recharts), payer denial rates bar chart, payer performance table, recent claims widget

**Build result:** Zero errors. All 20 routes compile cleanly.

---

### 2026-03-16 — Vindica Branding Applied

Replaced all placeholder branding with the full Vindica design system from the spec.

- **app/globals.css** — replaced all oklch/blue variables with exact Vindica hex palette: `--primary: #5B3FD4`, `--midnight: #1A1033`, `--mint: #3BBFB0`, `--ghost: #F0EEFF`, `--primary-light: #8B72E8`, `--primary-mist: #E8E4FF`, `--white: #F8F7FF`, `--danger: #DC2626`, `--warning: #D97706`, `--border: #E8E6F0`. DM Sans only (removed Instrument Serif). Tailwind `@theme inline` extended with all brand colors.
- **components/layout/VindicaMark.tsx** — created SVG logo mark from spec: medical cross from two pill rects + center circle + 4 accent dots. Supports `variant="default"` (#5B3FD4) and `variant="dark"` (#8B72E8).
- **components/layout/VindicaLogo.tsx** — full wordmark: VindicaMark(80) + "Vindi**ca**" in Trebuchet MS + tagline + divider + subtitle.
- **components/layout/Sidebar.tsx** — rebuilt: `bg-midnight`, VindicaMark dark variant, "Vindi**ca**" wordmark, active nav pill `bg-primary`, inactive nav at 45% opacity.
- **lib/constants.ts RISK_COLORS** — updated: LOW=mint, MEDIUM=amber, HIGH=orange, CRITICAL=red.
- **app/(auth)/login/page.tsx** — midnight background, VindicaLogo, primary color buttons.
- **app/(auth)/register/page.tsx** — same pattern, VindicaMark(56).
- **app/layout.tsx** — title changed from `'ClaimGuard AI — Dental Claim Denial Predictor'` to `'Vindica — Dental Claim Denial Predictor'`.
- **Payer page** — fixed `<tbody>` nested in `<tbody>` hydration error (replaced with React.Fragment).

---

### 2026-03-16 — Vindica SVG Favicon

- **app/icon.svg** — created Vindica mark SVG with transparent background: two pill rects at 15% opacity with 50% stroke, solid center circle, four accent dots at 35% opacity. Initial color #5B3FD4, then darkened to `#3B1FA8` for better tab visibility.
- Next.js App Router auto-serves `app/icon.svg` as the favicon — no `<link>` tag needed.

---

### 2026-03-16 — Switch Default AI Model to Haiku 4.5

- All three AI modules (`claim-analyzer.ts`, `appeal-generator.ts`, `cdt-optimizer.ts`) updated from `claude-sonnet-4-20250514` to `claude-haiku-4-5-20251001` as the default model.

---

### 2026-03-16 — Claim Edit Page

- **app/(dashboard)/claims/[id]/edit/page.tsx** — new edit page: pre-populates all claim fields from the API, PATCHes on save, redirects back to detail page.
- **app/(dashboard)/claims/[id]/page.tsx** — added Edit Claim button (Pencil icon) in action bar, visible only when claim status is DRAFT or PENDING.

---

### 2026-03-16 — Fix Denial Risk Gauge Centering

- **app/(dashboard)/claims/[id]/page.tsx** — replaced broken CSS clip-path gauge with proper SVG `<path>` arc using `strokeDasharray`/`strokeDashoffset`. Arc renders perfectly centered at all times.

---

### 2026-03-16 — Claude Hooks: Auto-Read and Auto-Update Retrospective

- **.claude/settings.local.json** — added two hooks:
  1. `UserPromptSubmit` hook: reads RETROSPECTIVE.md and injects it into Claude's context at the start of every prompt, so Claude always knows the project state.
  2. `Stop` hook: fires after every Claude response, echoing a reminder to update RETROSPECTIVE.md immediately. Ensures the retrospective never goes stale.

---

### 2026-03-16 — Login Page Cleanup

- **app/(auth)/login/page.tsx** — removed demo credentials hint box, updated email placeholder to `you@example.com`.
- **.env.example** — deleted (real API key in `.env.local`).

---

### 2026-03-16 — Fix Claim Edit Not Saving (Critical PATCH Bug)

- **Root cause:** `app/api/claims/[id]/route.ts` PATCH handler was doing `data: body` — passing the raw parsed request body directly to Prisma. This throws `PrismaClientValidationError` when the body contains unknown fields (e.g. `id`, read-only relations) or when DateTime fields are strings instead of Date objects.
- **Fix:** Explicitly destructured only the allowed fields and coerced all DateTime fields with `new Date()`. PATCH catch block now returns the actual error message instead of generic "Internal server error".

---

### 2026-03-16 — Fix Documentation Checklist Not Saving

- **Root cause:** The four boolean doc fields (`xraysAttached`, `perioCharting`, `preAuthObtained`, `narrativeIncluded`) were referenced in the AI prompt and edit form but never existed in the database schema.
- **prisma/schema.prisma** — added four Boolean fields to Claim model (all default false).
- **prisma/migrations/20260316211903_add_documentation_fields** — migration applied.
- **app/api/claims/[id]/route.ts** — PATCH route now accepts and saves the four doc fields.
- **app/(dashboard)/claims/[id]/edit/page.tsx** — loads doc values from API on mount, sends them in PATCH body.

---

### 2026-03-16 — Fix AI Not Seeing Documentation Checklist Values

- **Root cause:** The four doc boolean fields existed in `ClaimInput` type and were being saved to DB correctly, but `app/api/claims/[id]/analyze/route.ts` was never passing them to `analyzeClaim()`. Claude always received `undefined` for all four and could not adjust the risk score based on documentation.
- **Fix:** All four fields now explicitly passed from the DB claim object to `analyzeClaim()`.

---

### 2026-03-16 — Turbopack Cache: Rule Established

- **Root cause:** Turbopack bundles and caches the Prisma client inside `.next/dev/server/chunks/`. Running `npx prisma generate` updates `node_modules/@prisma/client` but Turbopack's in-memory bundle cache still serves the stale version — any new schema field throws `PrismaClientValidationError`.
- **Fix / Rule:** After every `prisma migrate dev`, always run `rm -rf .next && npx prisma generate` before restarting the dev server. Do not just restart — the cache must be deleted.

---

### 2026-03-16 — AI Model Selector

Added user-selectable AI model with localStorage persistence. Default is Haiku 4.5 (fast/cheap); users can upgrade to Sonnet or Opus in Settings.

- **lib/constants.ts** — added `AI_MODELS` array (Haiku 4.5, Sonnet 4.6, Opus 4.6) and `DEFAULT_AI_MODEL = 'claude-haiku-4-5-20251001'`.
- **lib/hooks/useAIModel.ts** — new file: `useAIModel()` React hook (reads/writes localStorage key `vindica_ai_model`), `getStoredModel()` for server/non-hook contexts.
- **lib/ai/claim-analyzer.ts** — added `model` parameter with default `DEFAULT_AI_MODEL`.
- **lib/ai/appeal-generator.ts** — added `model` parameter with default `DEFAULT_AI_MODEL`.
- **app/api/claims/[id]/analyze/route.ts** — reads `model` from request body, passes to `analyzeClaim()`.
- **app/api/appeals/[id]/generate/route.ts** — reads `model` from request body, passes to `generateAppealLetter()`.
- **app/(dashboard)/settings/page.tsx** — rebuilt as `'use client'` component with AI Model card: radio-style buttons for each model, persists to localStorage via `useAIModel` hook.
- Model dropdowns were initially added to the claims and appeals pages, then moved to Settings only (see next entry).

---

### 2026-03-16 — Move AI Model Selector to Settings Only

- Removed inline model dropdown from `app/(dashboard)/claims/[id]/page.tsx` and `app/(dashboard)/appeals/[id]/page.tsx`.
- Both pages now call `getStoredModel()` silently on analysis/generation — no UI dropdown shown.
- Settings page is the single place to change the model.

---

### 2026-03-17 — Add Tooth Numbers, Treating Provider NPI, Pre-Auth Number

Three new fields added across the full stack so the AI has all clinical and administrative context.

- **prisma/schema.prisma** — added to Claim model: `toothNumbers String[]`, `providerNpi String?`, `preAuthNumber String?`.
- **prisma/migrations/20260317032114_add_tooth_provider_preauth** — migration applied; `.next` cache cleared.
- **types/index.ts** — added `toothNumbers?`, `providerNpi?`, `preAuthNumber?` to `ClaimInput`.
- **lib/ai/claim-analyzer.ts** — prompt now includes all three fields so AI can flag: missing tooth numbers for D2740/D4341/D6010, absent NPI for billing validation, missing pre-auth number when pre-auth checkbox is checked.
- **app/api/claims/[id]/analyze/route.ts** — passes all three new fields to `analyzeClaim()`.
- **app/api/claims/[id]/route.ts** — PATCH route saves all three fields.
- **app/(dashboard)/claims/new/page.tsx** — added Tooth Numbers multi-input (numeric 1–32, below CDT Codes), Treating Provider NPI (in Patient Information section), Pre-auth Number (conditionally revealed when pre-auth checkbox is checked).
- **app/(dashboard)/claims/[id]/edit/page.tsx** — full rewrite to match new claim form: all three fields load from API on mount, are editable, and sent in PATCH body.
- **app/(dashboard)/claims/[id]/page.tsx** — summary card now shows: tooth number pills (purple), Provider NPI, Pre-auth Number, and a documentation row with green ✓ / gray ✗ badges for all four doc flags.

---

### 2026-03-17 — Fix Dashboard KPIs Showing Stale Data (Two-Layer Cache Fix)

Two separate caching layers were preventing dashboard KPIs (Revenue at Risk, denial rate, etc.) from updating after claim changes.

- **Layer 1 — Server component cache:** `app/(dashboard)/dashboard/page.tsx` — added `export const dynamic = 'force-dynamic'` to prevent Next.js from caching the server component render.
- **Layer 2 — Router cache:** `next.config.ts` — added `experimental.staleTimes.dynamic = 0` to disable the Next.js client-side router cache (default 30s TTL). Without this, navigating to /dashboard via the sidebar served a cached page even though the server was fetching fresh data.

---

### 2026-03-17 — Fix Risk Factor Text Truncating

- **app/(dashboard)/claims/[id]/page.tsx** — removed `truncate` CSS class and `min-w-0` from risk factor text span and its flex container. Factors now display the full sentence instead of cutting off with "...".

---

### 2026-03-17 — Add Spacing in CDT Code Review Table

- **app/(dashboard)/claims/[id]/page.tsx** — added `pr-6` padding to Code and Issue columns in the CDT Code Review table so text doesn't run together.

---

### 2026-03-17 — Restore localhost:3000

- `.env.local` — reverted `NEXTAUTH_URL` back to `http://localhost:3000` (had drifted to 3001 after a port conflict when clearing `.next` while the old server was still running).
- Killed stale node process, restarted dev server on port 3000.

---

### 2026-03-17 — Anti-Hallucination RAG Knowledge Base

Built a structured static knowledge base that gets selectively injected into every AI prompt, grounding analysis in real dental billing rules instead of Claude's general training knowledge.

**Problem solved:** Every AI call was relying on Claude's training to fill in CDT code requirements, payer frequency rules, bundling policies, and clinical guidelines — producing inconsistent, sometimes fabricated reasoning. This system replaces that with verified, deterministic rules injected per claim.

**Files created (`lib/knowledge/`):**
- **cdt-codes.ts** — 16 CDT code entries (D0120–D7240): human-readable description, required documentation checklist (specific line items), bundling conflicts, frequency limit, pre-auth flag, and supporting ICD-10 diagnosis codes per code.
- **payer-policies.ts** — structured rules for all 8 seed payers (Delta Dental, Anthem BCBS, Cigna, Aetna, United Concordia, MetLife, Guardian, Humana): per-code frequency rules, coding preferences and downcode risks, per-code documentation requirements, bundling warnings, and payer-specific appeal tips.
- **icd10-support.ts** — 30+ ICD-10 codes mapped to the CDT procedures they clinically support, with citable justification text per code. Covers: K05.x periodontal, K02.x caries, K08.x tooth loss, K04.x pulpal disease, K01.x impactions, Z01.x preventive, S02.x trauma.
- **clinical-guidelines.ts** — citable ADA/AAP guideline snippets for: periodontalTherapy, implants, crowns, periodontalMaintenance, extractionCriteria, diagnosticRadiographs. Includes `CDT_TO_GUIDELINE_MAP` linking procedure codes to applicable guideline categories.
- **context-builder.ts** — `buildClaimContext(claim)` and `buildAppealContext(cdtCodes, payerId, denialReason)`: selectively assembles only the CDT code entries, payer policy rules, ICD-10 support rows, and guideline snippets that are relevant to the specific claim's codes. Injects as a `[KNOWLEDGE BASE]` block.

**Files modified:**
- **lib/ai/claim-analyzer.ts** — imports `buildClaimContext`, appends `[KNOWLEDGE BASE]` block to every analysis prompt.
- **lib/ai/appeal-generator.ts** — imports `buildAppealContext`, adds `payerId` to `ClaimForAppeal` interface, appends `[KNOWLEDGE BASE]` block (including payer-specific appeal tips matched to the denial reason) to every appeal prompt.
- **lib/ai/prompts.ts** — both system prompts now have `CRITICAL INSTRUCTION` sections: Claude is told to treat the injected knowledge as ground truth, prioritize it over general training, and cite it explicitly in analysis and appeal letters.

**What this prevents:**

| Hallucination type | Fix |
|---|---|
| Wrong frequency limits | Exact payer rules injected per claim |
| Made-up documentation requirements | CDT-specific checklist injected |
| Incorrect bundling rules | Explicit conflict list per code |
| Vague clinical justification | ADA/AAP guideline snippets injected |
| Inconsistent appeal arguments | Payer-specific appeal tips injected |
| Wrong ICD-10 → CDT support logic | Support matrix injected for the claim's diagnosis codes |

---

### 2026-03-18 — Pre-Submission Dental Claim Scrubber

Built a 20-item interactive pre-submission checklist inside the Vindica dashboard. Billers run through it before submitting a claim to catch the most common denial-causing errors. Accessible standalone via the sidebar or pre-populated from any claim's detail page.

**Files created:**
- **components/scrubber/ScrubberClient.tsx** — `'use client'` component; manages `Set<string>` checkbox state; 4 sections × 5/4/6/5 items; live progress bar (gradient `#5B3FD4 → #3BBFB0`); section headers turn mint green with ✓ icon when all items in that section are checked; "Claim Ready to Submit" banner at 100%; Reset button; pre-fill banner if opened from a claim; dark Vindica midnight background throughout.
- **app/(dashboard)/scrubber/page.tsx** — server component; reads `searchParams.claimId`; if present, fetches claim from Prisma and verifies ownership; computes `initialChecked` from claim fields (`xraysAttached → radiographs`, `perioCharting → perio_chart`, `narrativeIncluded → narrative`, `preAuthObtained → preauth`, `providerNpi → type1_npi`); passes to `ScrubberClient`.

**Files modified:**
- **components/layout/Sidebar.tsx** — added `ClipboardCheck` nav item for `/scrubber` between Appeals and Payer Intelligence.
- **app/(dashboard)/claims/[id]/page.tsx** — added "Pre-Submit Scrubber" button (violet border, `ClipboardCheck` icon) visible when claim status is DRAFT, PENDING, or SUBMITTED; links to `/scrubber?claimId={id}`.

**Checklist sections and items:**
1. Patient Demographics (5): legal name, DOB, subscriber/relationship, insurance ID/group, COB
2. Provider & Credentialing (4): Type 1 NPI in Box 54, Type 2 NPI in Box 49, credentialing, payer ID
3. Coding Accuracy (6): current CDT codes, tooth/surfaces, no duplicates/unbundling, frequency limits, pre-auth reference, primary EOB for COB claims
4. Attachments (5): radiographs, perio chart, clinical narrative, lab receipt for D2750, intraoral photos

Each item shows a short title and a "why it matters" subtitle explaining the denial risk.

---

### 2026-03-18 — Denial Decoder Tool

Built a hardcoded, client-side CARC code reference tool. Billers type a code or keyword and get instant filtered results with actionable guidance. No database — all 14 codes are static data in the component.

**Files created:**
- **components/denial-decoder/DenialDecoderClient.tsx** — `'use client'` component; `useState` search query filtering all 14 denial codes by code, description, type, and action detail; result cards with monospace code, type badge (blue/purple/yellow/red/orange/gray), appealable badge (green/yellow/red), and action guidance box in violet; empty state with prompt; static "Critical Distinctions" section below results with 3 left-bordered info cards.
- **app/(dashboard)/denial-decoder/page.tsx** — thin server component shell: Header + DenialDecoderClient.

**Files modified:**
- **components/layout/Sidebar.tsx** — added `BookOpen` nav item for `/denial-decoder` between Claim Scrubber and Payer Intelligence.

**The 14 CARC codes covered:** CO-4, CO-11, CO-16, CO-18, CO-22, CO-29, CO-45, CO-50, CO-96, CO-97, CO-119, CO-151, CO-167, OA-23.

**Critical Distinctions section (3 static cards):**
1. Clearinghouse Rejection vs. Payer Denial (blue border)
2. Timely Filing Deadlines by payer — table with Delta/Cigna/Aetna/MetLife/UHC/Medicaid/Medicare (yellow border)
3. "Procedure Inclusive" Warning — CO-97 misunderstanding explanation (orange border)

---

### 2026-03-18 — Expert Knowledge Base Expansion + HIPAA Compliance Sprint

**Expert knowledge base expanded:**
- **lib/knowledge/cdt-codes.ts** — expanded from 16 to 32 CDT codes. Added `denialRisk` level and `criticalNotes[]` to every entry. New codes: D0140, D0150, D0220, D0230, D0272, D0330, D1206, D1351, D2150, D2330, D2392, D2394, D2950, D3120, D3310–D3330, D4355, D5110/D5120, D6750, D7220/D7230, D8080, D9215.
- **lib/knowledge/payer-policies.ts** — added `timelyFiling`, `appealWindow`, `behaviorNotes` fields to all entries. Enriched all 6 original payers and added 3 new: UNITED001, BCBS001, MEDICAID001. Key additions: Cigna's call-before-appeal, Aetna peer-to-peer fax, MetLife writing-only appeals, Delta FMX reclassification trap, Medicaid balance-billing prohibition.
- **lib/knowledge/billing-rules.ts** — new file: `BUNDLING_MASTER`, `TIMELY_FILING` deadlines by payer, `CARC_DENIAL_CODES` (13 codes with actions + overturn rates), `APPEAL_STRATEGY` (winning elements, counter-language, banned word list, ERISA citation, payer-specific channels), `COB_RULES`, `AR_PRIORITY_RULES`, `KPI_BENCHMARKS`.
- **lib/knowledge/context-builder.ts** — `buildClaimContext` now injects bundling rules, CARC lookup, timely filing. `buildAppealContext` always injects `APPEAL_STRATEGY`. New helpers: `buildBundlingSection()`, `buildCarcSection()`.

**HIPAA bcrypt audit (no changes needed):** All requirements already met — bcryptjs installed, `bcrypt.hash(password, 12)` on register, `bcrypt.compare()` on login, `password String?` nullable in schema, no plaintext password logging anywhere.

**Merged AR Queue into Claims tabs:**
- **components/claims/ClaimsTabs.tsx** — new `'use client'` tab shell: "All Claims" tab (ClaimsListView) and "AR Queue" tab (ARQueueClient). Active tab uses `border-b-2 border-[#5B3FD4]`.
- **components/claims/ClaimsListView.tsx** — extracted original claims page client logic into standalone component.
- **app/(dashboard)/claims/page.tsx** — rewritten as server component: fetches AR Queue claims from Prisma, maps to AR Queue format, renders ClaimsTabs.
- **app/(dashboard)/ar-queue/page.tsx** — replaced with `redirect('/claims')`.
- **components/layout/Sidebar.tsx** — removed AR Queue nav item.

**HIPAA session timeout (15-minute inactivity):**
- **lib/auth.ts** — added `maxAge: 900` to `session` config (server-side JWT cap at 15 min).
- **components/Providers.tsx** — created `'use client'` SessionProvider wrapper (required so root layout stays a server component).
- **components/SessionTimeoutWarning.tsx** — inactivity tracker: `WARN_MS = 13 min`, `LIMIT_MS = 15 min`. Listens for mousemove/mousedown/keydown/touchstart/scroll on document. Shows amber warning modal at 13 min; auto-logs out at 15 min via `signOut({ callbackUrl: '/login?reason=timeout' })`. "Stay Logged In" resets timers. Returns null when unauthenticated or no warning.
- **app/layout.tsx** — wrapped body with `<Providers>` and mounted `<SessionTimeoutWarning />`.
- **app/(auth)/login/page.tsx** — restructured: `LoginForm` (inner client component, reads `useSearchParams()`) wrapped in `<Suspense>` by `LoginPage` (default export). Shows amber banner "You were logged out due to inactivity." when `?reason=timeout` is present.

---

### 2026-03-19 — HIPAA Audit Log Viewer

Added a full HIPAA audit log system: DB model, write helper, ADMIN-only API, and settings page viewer. No PHI is stored — only user emails, action types, and resource IDs (e.g. `claim:clm_abc123`).

**Schema changes (`prisma/schema.prisma`):**
- `UserRole` enum: `USER`, `ADMIN`
- `AuditAction` enum: `LOGIN`, `VIEW`, `CREATE`, `UPDATE`, `DELETE`
- `AuditOutcome` enum: `SUCCESS`, `FAILURE`
- `User.role UserRole @default(USER)` — all existing users default to USER
- `User.auditLogs AuditLog[]` relation
- New `AuditLog` model: `id`, `timestamp`, `userId?`, `userEmail`, `action`, `resource`, `outcome`, `ipAddress?`, `details?`. Indexed on `timestamp(desc)`, `userEmail`, `action`.
- Migration: `20260319041122_add_audit_logs`

**Files created:**
- **`lib/audit.ts`** — `writeAuditLog(params)` helper. Never throws — write failures log to console and are swallowed so they never crash the main request.
- **`types/next-auth.d.ts`** — Module augmentation adding `role: string` to `session.user`.
- **`app/api/audit-logs/route.ts`** — ADMIN-only GET endpoint. Re-verifies role from DB (not just JWT) for security. Accepts `userEmail` (text search), `action` (enum filter), `startDate`/`endDate` (inclusive range). Returns max 100 records ordered by timestamp desc. Returns 403 if not ADMIN. Selects only id/timestamp/userEmail/action/resource/outcome — no details/ipAddress in list view.
- **`components/settings/AIModelCard.tsx`** — extracted from old settings page (unchanged logic).
- **`components/settings/AuditLogViewer.tsx`** — `'use client'` component. Filters: debounced email search (400ms), action dropdown, start/end date pickers. Table columns: Date & Time | User | Action (colored badge) | Resource | Outcome (colored badge). Loading skeleton, "No logs found" empty state, error state. Formats timestamps as "Jan 15, 2024, 10:32 AM".

**Files modified:**
- **`lib/auth.ts`** — JWT callback now fetches `role` from DB on first sign-in, stores in token. Session callback exposes `session.user.role`. `authorize` callback writes LOGIN audit log on both SUCCESS and FAILURE.
- **`app/(dashboard)/settings/page.tsx`** — converted from `'use client'` to async server component. Fetches role from DB, renders `<AuditLogViewer />` only when `isAdmin === true`. Renders `<AIModelCard />` (extracted client component) for everyone.

**Action badge colors:** LOGIN=blue, VIEW=gray, CREATE=green, UPDATE=yellow, DELETE=red.
**Outcome badge colors:** SUCCESS=green, FAILURE=red.

**To promote a user to ADMIN:** Run directly in DB:
```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'you@example.com';
```

---

### 2026-03-19 — Multi-Factor Authentication (Email Verification Codes)

Added full HIPAA-grade MFA to the login flow. Users with `mfaEnabled=true` (default for all users) must enter a 6-digit email code after their password before a NextAuth session is created.

**Architecture**: NextAuth credentials provider does not natively support multi-step auth. The solution uses a custom `credentials-check` API route that validates the password without creating a session, then redirects to a verify page. The verify page calls `/api/auth/verify-mfa` which — on success — issues a single-use `mfaToken` (UUID, 5-min TTL) stored in the DB. The verify page then calls `signIn('credentials', { email, mfaToken })` which hits a new path in the NextAuth `authorize` function that validates and consumes the token to create the session.

**Schema changes (`prisma/schema.prisma`):**
- Added to `User`: `mfaEnabled Boolean @default(true)`, `mfaCode String?`, `mfaCodeExpiry DateTime?`, `mfaAttempts Int @default(0)`, `mfaLockedUntil DateTime?`, `mfaToken String?`, `mfaTokenExpiry DateTime?`
- Migration: `20260319044028_add_mfa_fields`

**Dependencies:** `nodemailer@7` (v7 required by next-auth beta), `@types/nodemailer`

**Files created:**
- **`lib/email.ts`** — Nodemailer SMTP transport singleton. `sendEmail({ to, subject, text })`. Reads `SMTP_HOST/PORT/USER/PASSWORD/FROM` from env.
- **`lib/auth/mfa.ts`** — `generateMfaCode(userId)`: generates 6-digit code (100000–999999), saves with 10-min expiry, resets `mfaAttempts`, returns plaintext code for emailing.
- **`app/api/auth/credentials-check/route.ts`** — POST `{ email, password }`. Validates bcrypt. Returns `{ userId, email, mfaEnabled }`. Does NOT create a session. Writes audit log on failure.
- **`app/api/auth/send-mfa/route.ts`** — POST `{ userId }`. Calls `generateMfaCode`, fetches user email, calls `sendEmail`. Subject: "Your Vindica verification code". Used for initial send and resend.
- **`app/api/auth/verify-mfa/route.ts`** — POST `{ userId, code }`. Checks lock (`mfaLockedUntil`). Validates code + expiry. Increments `mfaAttempts` on failure; locks for 30 min after 5 failures. On success: clears MFA fields, sets `mfaToken` (UUID) + `mfaTokenExpiry` (5 min), returns `{ ok, mfaToken, email }`.
- **`app/auth/verify/page.tsx`** — 6 individual digit inputs with auto-advance (onInput), backspace navigation (onKeyDown), paste handling (onPaste). Calls verify-mfa, then `signIn('credentials', { email, mfaToken })`. Error banner on failure. 60-second resend countdown. Styled to match login page (midnight bg, white card, `#5B3FD4` primary).

**Files modified:**
- **`lib/auth.ts`** — Added `mfaToken` to credentials definition. Split `authorize` into two paths: (1) mfaToken path — validates single-use token, consumes it, creates session; (2) password path — existing bcrypt flow, but returns `null` for `mfaEnabled=true` users to block direct session creation.
- **`app/(auth)/login/page.tsx`** — Replaced direct `signIn()` call with: fetch `/api/auth/credentials-check` → if mfaEnabled, fetch `/api/auth/send-mfa` and redirect to `/auth/verify?userId=...&email=...`; if not mfaEnabled, call `signIn()` directly.
- **`proxy.ts`** — Added `/auth/verify` to `isAuthPage` check so unauthenticated users can reach the verify page and authenticated users are redirected to dashboard.
- **`.env.local`** — Added `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` with placeholder values.

**To activate:** Fill in real SMTP credentials in `.env.local`. All users have `mfaEnabled=true` by default. Set `mfaEnabled=false` in DB to disable MFA for a specific user.

---

### 2026-03-19 — RBAC (4-Role System) + Multi-Tenancy + PHI Encryption

**RBAC:**
- `prisma/schema.prisma` — replaced `UserRole { USER, ADMIN }` with `Role { ADMIN, OFFICE_MANAGER, BILLER, PROVIDER }`. Added `isActive Boolean @default(true)` to User. Added `UPDATE_USER_ROLE` to `AuditAction`.
- Migration `20260319100000_add_rbac` — custom SQL: add new enum, migrate values (USER→BILLER), drop old enum.
- `lib/auth/roles.ts` — permission helpers: `canManageUsers`, `canViewAuditLogs`, `canViewReports`, `canCreateClaims`, `canDeleteClaims`.
- `lib/auth/protect.ts` — `protect(req, allowedRoles[])` middleware: re-verifies role AND `isActive` from DB on every call.
- `lib/auth.ts` — added `isActive` check in both MFA token path and password path. Falls back to `BILLER` instead of `USER`.
- `app/api/auth/register/route.ts` — self-registered practice owners get `role: 'ADMIN'` automatically.
- `app/api/claims/route.ts` — POST guarded by `protect(req, ['ADMIN', 'OFFICE_MANAGER', 'BILLER'])`.
- `app/api/claims/[id]/route.ts` — DELETE guarded by `protect(req, ['ADMIN'])`.
- `app/api/audit-logs/route.ts` — replaced manual role check with `protect(req, ['ADMIN'])`.
- `components/layout/Sidebar.tsx` — role-aware nav: PROVIDER sees only Dashboard, Claims, Settings.
- `components/settings/UserManagement.tsx` — table of practice users with Edit Role modal and Deactivate/Activate toggle; "Create Account" button with modal (name, email, temp password, role).
- `app/(dashboard)/settings/page.tsx` — converted to shadcn Tabs: General | Practice Management | Audit Logs.

**Multi-tenancy:**
- `prisma/schema.prisma` — added `practiceId String?` and `memberOf Practice? @relation("PracticeMembers")` to User; added `members User[] @relation("PracticeMembers")` to Practice.
- Migration `20260319110000_add_practice_member` — adds FK column, backfills owners via UPDATE.
- `app/api/users/route.ts` — GET scoped to practice; POST creates employees linked to admin's practice.
- `app/api/users/[id]/route.ts` — PATCH validates target is in same practice before edits.

**Practice KPIs:**
- `app/api/practice/stats/route.ts` — parallel DB aggregation: total claims, billed, approved revenue, denied, pending, recovered, appeal win rate, active users.
- `components/settings/PracticeStats.tsx` — 8 KPI cards with skeleton loaders.

**Email (Resend):**
- `lib/email.ts` — switched from Mailtrap to Resend SDK. Sender: `noreply@vyndico.com`.
- `.env.local` — added `RESEND_API_KEY`.

**Field-level AES-256-GCM PHI Encryption (COMPLETE):**
- **What is encrypted:** `patientName`, `patientDob`, `patientInsuranceId`, `diagnosisCodes` (Claim); `letterContent` (Appeal). `toothNumbers` intentionally NOT encrypted (non-identifying clinical metadata).
- `lib/security/encrypt.ts` — AES-256-GCM utility. Key from `ENCRYPTION_KEY` env (must be exactly 32 chars). Format: `enc:<iv_hex>:<authTag_hex>:<ciphertext_hex>`. `safeDecrypt()` returns value unchanged if no `enc:` prefix (migration safety for legacy plaintext data).
- `prisma/schema.prisma` — `patientDob DateTime → String`; `diagnosisCodes String[] → String`.
- Migration `20260319120000_encrypt_phi_columns` — `ALTER TABLE "Claim" ALTER COLUMN "patientDob" TYPE TEXT USING "patientDob"::TEXT`; same for `diagnosisCodes` using `array_to_json()`.
- `lib/db/claims.ts` — DAL: `DecryptedClaim` type (patientDob restored to Date, diagnosisCodes to string[]). Exports: `createClaim`, `getClaimById`, `listClaims`, `updateClaim`, `deleteClaim`. Also exports `decryptPHI` for use by appeals DAL.
- `lib/db/appeals.ts` — DAL: `saveAppealLetter(id, content)` encrypts letterContent; `getAppeal(id)` decrypts; `listAppeals(practiceId)` decrypts patientName in joined claim data.
- `app/api/claims/route.ts` — GET uses `listClaims()`, POST uses `createClaim()`.
- `app/api/claims/[id]/route.ts` — GET uses `getClaimById()`, PATCH uses `updateClaim()`, DELETE uses `deleteClaim()`.
- `app/api/claims/[id]/analyze/route.ts` — uses `getClaimById()` (returns `DecryptedClaim` with `patientDob: Date`). `updateClaim()` for AI result fields.
- `app/api/appeals/route.ts` — GET uses `listAppeals()` (decrypts patientName), POST uses `getClaimById()` for ownership check.
- `app/api/appeals/[id]/route.ts` — GET uses `getAppeal()`, PATCH encrypts letterContent via `saveAppealLetter` if present.
- `app/api/appeals/[id]/generate/route.ts` — uses `getAppeal()` (returns `DecryptedClaim` with `patientDob: Date` for `ClaimForAppeal` interface); `saveAppealLetter()` to encrypt generated letter.
- `prisma/seed.ts` — imports `encrypt` from `lib/security/encrypt`; PHI fields and `letterContent` are encrypted at seed time.
- `.env.local` — `ENCRYPTION_KEY=4cedee92a78c856d19d12b14c922d446` (32-char hex). **BACK THIS UP — if lost, all encrypted PHI is permanently unreadable.**

---

### 2026-03-19 — Remove PHI from AI Prompts

**Problem:** Both AI functions were sending `patientName`, `patientDob`, and `patientInsuranceId` to Anthropic in plaintext on every call — a HIPAA risk without a signed BAA.

**Fix:**
- `lib/ai/claim-analyzer.ts` — removed patient name, DOB, and insurance ID from the prompt. The AI only needs CDT codes, diagnosis codes, payer info, and documentation flags to score denial risk. Identity fields are irrelevant.
- `lib/ai/appeal-generator.ts` — replaced the three PHI lines in the prompt with placeholder tokens (`[PATIENT_NAME]`, `[PATIENT_DOB]`, `[PATIENT_INSURANCE_ID]`). After Claude returns the letter, a `.replace()` chain substitutes the real values locally before returning. No PHI ever leaves the server in the API call; the final letter stored in the DB contains real patient info (encrypted at rest).

---

### 2026-03-19 — Denial Trend Dashboard

Built a full analytics dashboard at `/denial-trends` showing 8 sections of denial pattern data.

**Files created:**
- `app/api/analytics/denials/route.ts` — ADMIN + OFFICE_MANAGER only. Accepts `startDate`/`endDate` params. Queries `status`, `totalAmount`, `payerName`, `cdtCodes`, `denialCode`, `denialReason`, `serviceDate`, `providerNpi` (no PHI fields). Computes all aggregations in JS: top metrics, denial trend by month, payer breakdown, CDT code breakdown (top 10), CARC reason breakdown with category mapping, provider breakdown, and auto-generated alerts. Returns `isSampleData: true` with a hardcoded realistic dataset if the practice has no claims.
- `app/(dashboard)/denial-trends/page.tsx` — server page shell with `force-dynamic`.
- `components/denial-trends/DenialTrendsDashboard.tsx` — `'use client'` component. Date range state (`1m`/`3m`/`6m`/`12m`/`custom`). All 8 sections: metric cards, date filter bar, line chart (with 5% target reference line), horizontal bar chart for payers, CDT table, donut chart for denial reasons, alerts panel, provider table. Uses `formatCurrency` from `lib/utils`. All charts use Recharts (already installed v3.8.0).

**Files modified:**
- `components/layout/Sidebar.tsx` — added "Denial Trends" nav item (TrendingDown icon) visible to ADMIN and OFFICE_MANAGER only.
- `components/denial-decoder/DenialDecoderClient.tsx` — added `useSearchParams()` to initialize query state from `?search=` URL param. Clicking "View in Denial Decoder" from CDT table now pre-populates the search.
- `app/(dashboard)/denial-decoder/page.tsx` — wrapped `DenialDecoderClient` in `<Suspense>` (required since it now calls `useSearchParams()`).

**Key design decisions:**
- Analytics queries Prisma directly (no DAL) — only non-PHI fields selected.
- Sample data is generated in JS in the API handler (no DB writes) when `claimCount === 0`.
- CARC codes categorized into 9 groups with overturn rates and priority (High/Low/Fatal).
- Alert rules: payer > 15% denial rate (red), CO-29 timely filing (red), CDT > 20% with ≥5 occurrences (yellow), rising trend (yellow), < 50% appeals filed rate (yellow).

---

### 2026-03-19 — Appeal ROI Calculator

Built a standalone tool at `/roi-calculator` that helps billing specialists decide whether a denied claim is worth appealing.

**Files created:**
- `app/(dashboard)/roi-calculator/page.tsx` — thin server page shell (Header + client component)
- `components/roi-calculator/ROICalculatorClient.tsx` — full `'use client'` component with all 7 sections

**Files modified:**
- `components/layout/Sidebar.tsx` — added `Calculator` icon + "ROI Calculator" nav item (visible to all NON_PROVIDER roles), positioned between Denial Decoder and Denial Trends

**Features:**
- Section 1 — Input panel: claim amount, payer (10 options), CARC code (12 options), CDT code, days since denial, staff rate (default $22), appeal time
- Section 2 — Live metric cards (update on every keystroke, no button needed): Overturn Probability, Expected Recovery, Appeal Cost, Net ROI, ROI Percentage — all color-coded green/yellow/red
- Section 3 — Recommendation banner (gated by "Calculate ROI" button): 5 variants — STRONG APPEAL (green), CONSIDER (yellow), WRITE OFF (gray), FATAL CO-29 (red), NOT COVERED CO-119 (gray)
- Section 4 — Appeal deadline warning: 4 urgency states (green/yellow/red pulsing/expired) based on payer window minus days since denial
- Section 5 — Payer-specific instructions card in `#E8E4FF` for all 10 payers
- Section 6 — Bulk analysis table: add rows, inline editing, auto-calculated ROI Score and Recommendation per row, Sort by ROI button, Export CSV, summary totals row
- Section 7 — Industry benchmarks panel on midnight background (`#1A1033`)

**Calculation logic:**
- Overturn rate = base CARC rate × payer multiplier (capped at 95%)
- Expected recovery = claim amount × overturn rate
- Appeal cost = staff rate × appeal hours
- Net ROI = expected recovery − appeal cost
- ROI % = net ROI ÷ appeal cost × 100

---

### 2026-03-19 — Credentialing & NPI Tracker

Built a full provider credentialing management system with new DB models, 5 API routes, a large client component, and seeded sample data.

**Schema changes (`prisma/schema.prisma`):**
- New enum: `CredentialStatus` (NOT_STARTED, APPLICATION_SENT, IN_PROCESS, CREDENTIALED, EXPIRED, TERMINATED, DENIED)
- New model: `Provider` — linked to Practice, with firstName/lastName/credentials/npiType1/licenseNumber/licenseState/licenseExpiry/deaNumber/specialty/startDate/active
- New model: `ProviderCredential` — per-payer credentialing row with status/applicationDate/approvalDate/expiryDate/contractType/providerNumber/notes
- New model: `CredentialingEvent` — audit trail for credentialing status changes and manual log entries
- Modified `Practice`: added `npiType2`, `taxId`, `billingAddress` fields, added `providers Provider[]` relation
- Migration: `20260320042317_add_credentialing_models`

**API routes created:**
- `app/api/providers/route.ts` — GET list (with credentialing + events), POST create (auto-creates 10 DEFAULT_PAYERS as NOT_STARTED)
- `app/api/providers/[id]/route.ts` — GET single, PUT update, DELETE soft-deactivate
- `app/api/providers/[id]/credentials/route.ts` — GET list, POST create, PUT update (auto-logs CredentialingEvent on status change)
- `app/api/providers/[id]/events/route.ts` — GET list, POST create manual event
- `app/api/practice/route.ts` — GET + PUT for npiType2/taxId/billingAddress/name/npi fields

**UI files created:**
- `app/(dashboard)/credentialing/page.tsx` — thin server page shell
- `components/credentialing/CredentialingClient.tsx` — full `'use client'` component with all 6 sections

**Components layout (6 sections):**
1. Provider List panel (col-span-2) — provider cards with name/NPI/specialty/active badge/progress bar/color status dot, Add Provider button opens shadcn Dialog modal
2. Provider Detail panel (col-span-3) — 3 tabs: Profile (edit form), Credentials (table with inline edit), Timeline (event log + Log Event form)
3. Alerts Panel — client-side computed from providers state: license expiry (<90d), credential expiry, expired credentials, NOT_STARTED payers, new provider gap (joined <6 months with NOT_STARTED payers)
4. NPI Validator — validates Box 54/49 NPIs, checks Type 1 NPI against provider list
5. Credentialing Checklist — collapsible, 4 steps with checkboxes, red warning banner
6. Practice NPI Panel — shows/edits practice npiType2/taxId/billingAddress

**Files modified:**
- `components/layout/Sidebar.tsx` — added ShieldCheck icon + "Credentialing" nav item (ADMIN/OFFICE_MANAGER only) between ROI Calculator and Denial Trends

**Seed data:**
- 3 sample providers seeded directly via Node with `.env.local` loaded
- Dr. Sarah Johnson DDS — fully credentialed, Cigna expiring in 45 days (yellow status)
- Dr. Marcus Rivera DMD — new provider (3 months), mix of IN_PROCESS and NOT_STARTED (red status — new provider gap)
- Dr. Lisa Chen RDH — mostly credentialed, Aetna EXPIRED 30 days ago (red status)

---

### 2026-03-20 — Month End Close Checklist

Built a full month-end billing close workflow at `/month-end`. ADMIN and OFFICE_MANAGER only.

**Schema changes (`prisma/schema.prisma`):**
- Added `MONTH_END_CHECKLIST_ITEM` to `AuditAction` enum
- New model `MonthEndClose`: per-practice per-month record with `month`, `year`, `notes`, `closedAt`, unique on `[practiceId, month, year]`
- New model `MonthEndItem`: per-checkbox state with `closeId`, `phase`, `itemKey`, `checked`, `checkedBy`, `checkedAt`, unique on `[closeId, itemKey]`
- Added `monthEndCloses MonthEndClose[]` relation to `Practice`
- Migration: `20260320044409_add_month_end_close`
- Updated `lib/audit.ts` — added `MONTH_END_CHECKLIST_ITEM` to `AuditAction` union type

**API routes created:**
- `app/api/month-end/route.ts` — GET finds-or-creates (upsert) close record for given month/year; also accepts `?archive=true` to return all records for archive view
- `app/api/month-end/[id]/items/route.ts` — PUT upserts a single item's checked state; auto-creates audit log with `MONTH_END_CHECKLIST_ITEM` action
- `app/api/month-end/[id]/notes/route.ts` — PUT updates close notes
- `app/api/month-end/[id]/close/route.ts` — POST sets `closedAt`; enforces all 31 items checked server-side
- `app/api/practice/stats/route.ts` — modified to accept optional `?month=M&year=Y` query params that filter claims by `serviceDate` within that month; also added `appealingCount` and `oldUnpaidCount` (claims > 30d unpaid) to response

**UI files created:**
- `app/(dashboard)/month-end/page.tsx` — thin server page shell
- `components/month-end/MonthEndClient.tsx` — full `'use client'` component

**Features:**
- 5 sequential phases (31 total items): AR Cleanup (7), Unbilled Procedures (5), ERA Reconciliation (6), Financial Reconciliation (6), Reporting (7)
- Phases 2–5 locked until previous phase is 100% complete (visual lock overlay)
- Optimistic UI: checkbox updates instantly, reverts if API fails
- Each completed item shows `checkedBy` email + timestamp
- Month/year selectors reload data for any historical period
- Overall progress bar + days-remaining badge (green/amber/red)
- "Close Month" button disabled until all 31 checked; enforced server-side too
- Once closed, `closedAt` timestamp shown + all checkboxes disabled
- KPI side panel pulls from `/api/practice/stats?month=M&year=Y`: collection rate, denial rate, denied amount, recovered, appeal win rate, pending appeals — color-coded vs benchmarks
- Notes textarea auto-saves 800ms after last keystroke with "Saved" confirmation
- Deadline reminders: old unpaid claims > 30d, pending appeals, end-of-month warning ≤5 days
- Archive panel (collapsible): all past closes with progress bar; click any row to expand full read-only checklist view

**Files modified:**
- `components/layout/Sidebar.tsx` — added `CalendarCheck` icon + "Month End Close" nav item (ADMIN/OFFICE_MANAGER only) after Credentialing

**Seed data:**
- February 2026 close seeded with 21/31 items checked (phases 1–3 complete + 3/6 of phase 4)
- Notes: "ERA from Cigna still pending reconciliation. All other payers balanced."
- All checked items attributed to `demo@claimguard.ai`

---

### 2026-03-22 — HIPAA Compliance Audit + Appeal Generator Hardening

**Audit finding:** PHI (patient name, DOB, insurance ID) was NOT being sent to Anthropic. The existing code already used the correct placeholder approach — `[PATIENT_NAME]`, `[PATIENT_DOB]`, `[PATIENT_INSURANCE_ID]` appear literally in the prompt; real values are substituted locally after the API call.

**Hardening changes made:**

- **`lib/ai/prompts.ts`** — Tightened `APPEAL_GENERATOR_SYSTEM_PROMPT`: replaced generic "Use [PLACEHOLDER]" instruction with explicit rules listing the pre-defined PHI tokens and instructing Claude to never replace/infer actual patient information.

- **`lib/ai/appeal-generator.ts`** — Three changes:
  1. Added HIPAA compliance comment block documenting the placeholder approach for future developers
  2. Added PHI assertion before `client.messages.create()`: checks `prompt.includes(patientName)` and `prompt.includes(insuranceId)` — throws `'HIPAA violation prevented: PHI detected in AI prompt'` if either is found, blocking the API call before PHI can be transmitted
  3. Bumped `max_tokens: 1500 → 3000` to prevent letter truncation (same class of bug as the claim analyzer D2740+D4341 issue)

- **`app/api/appeals/[id]/generate/route.ts`** — Added `writeAuditLog()` call after successful letter generation: `action: 'CREATE'`, `resource: 'appeal:<id>'`, `details: 'Appeal letter generated (PHI not transmitted to AI)'`

---

### 2026-04-01 — MFA Email: Branded HTML Template

- **`lib/notifications/email.ts`** — added `sendMfaEmail({ to, code, practiceName })`. Uses the same Vindica branded HTML template as notification emails (violet header, DM Sans, ghost background) but with a centred large monospace code block (`font-size:40px`, letter-spacing, #F0EEFF background tile, #C4B5FD border) instead of paragraphs.
- **`app/api/auth/send-mfa/route.ts`** — switched import from `sendEmail` in `lib/email` to `sendMfaEmail` from `lib/notifications/email`. Also fetches `practice.name` / `memberOf.name` so the practice name appears in the email header. Falls back to "Vindica" if neither is set.

---

### 2026-04-01 — Notification Test Endpoint

- **`app/api/test/notifications/route.ts`** (new) — sends one test email of every notification type (9 total) to `huseynaghayev61@gmail.com`. Protected by `Authorization: Bearer <CRON_SECRET>`. Each email includes a yellow "This is a test email" banner and the notification type name in the header. Added `RESEND_FROM_EMAIL`, `NEXT_PUBLIC_APP_URL`, and `CRON_SECRET` to `.env.local`.

---

### 2026-04-01 — AI Analyzer Hardening: Error Propagation + Determinism + Accuracy

**Error propagation:**
- `lib/ai/claim-analyzer.ts` — removed the broad catch-all that returned a fake 50%-score degraded response on any error. API errors (auth failures, model not found, rate limits) now propagate up. JSON parsing attempts strip → parse, then regex `/{[\s\S]*}/` extraction, then throws a descriptive error naming the raw output.
- `app/api/claims/[id]/analyze/route.ts` — returns actual error message in JSON response instead of generic "Internal server error".
- `app/(dashboard)/claims/[id]/page.tsx` — added `toast.error(body.error ?? 'AI analysis failed...')` so errors surface to the user instead of silently disappearing.

**Determinism:**
- `lib/ai/claim-analyzer.ts` — added `temperature: 0` to the `client.messages.create()` call. Same claim now produces the same risk score on repeated runs.

**Accuracy (structured system prompt):**
- `lib/ai/prompts.ts` — rewrote `CLAIM_ANALYZER_SYSTEM_PROMPT` to include 4 explicit steps: (1) per-code checklist (docs, diagnosis support, bundling, pre-auth, downcoding risk), (2) frequency limit check, (3) score calibration anchors (0–20 clean, 21–40 minor, 41–60 moderate, 61–79 high, 80–100 critical), (4) output JSON only.

---

### 2026-04-01 — Provider Field-Level Encryption (HIPAA)

Encrypted sensitive provider credentialing fields using the existing AES-256-GCM pattern. No schema migration needed — all fields were already `String`/`String?`.

**Fields encrypted:** `npiType1`, `licenseNumber`, `deaNumber` (Provider model).

- **`lib/db/providers.ts`** (new) — DAL for Provider records. `encryptProviderFields()` for writes, `decryptProvider()` for reads using `safeDecrypt()` (backwards-compatible: returns plaintext unchanged if no `enc:` prefix). Exports: `createProvider`, `getProviderById`, `listProviders`, `updateProvider`, `deactivateProvider`, `decryptProvider`.
- **`app/api/providers/route.ts`** — replaced `prisma.provider.findMany()` with `listProviders()`, `prisma.provider.create()` with `createProvider()`.
- **`app/api/providers/[id]/route.ts`** — replaced direct Prisma calls with `getProviderById()`, `updateProvider()`, `deactivateProvider()`.

---

### 2026-04-01 — Email Notification System (Resend)

Full notification system: 8 trigger types, nightly cron for AR thresholds, Vindica-branded HTML email template, DB-backed deduplication, per-practice opt-in/out preferences.

**Schema changes (`prisma/schema.prisma`):**
- Added `User.lastKnownIp String?` for new-device detection
- Added `User.notifications Notification[]` and `Practice.notifications Notification[]` relations
- Added `Practice.notificationPrefs Json?` for per-type opt-in/out storage
- New `Notification` model: `id`, `practiceId`, `userId?`, `type`, `payload` (Json, no PHI), `sentAt`. Indexed on `[practiceId, type, sentAt(desc)]`.
- New `NotificationType` enum: FAILED_LOGIN, NEW_DEVICE_LOGIN, NEW_USER_ADDED, ROLE_CHANGED, MFA_DISABLED, AR_THRESHOLD_30, AR_THRESHOLD_60, AR_THRESHOLD_90, HIGH_VALUE_CLAIM_UNPAID
- **Migration needed:** `npx prisma migrate dev --name add-notifications`

**Files created:**
- **`lib/notifications/email.ts`** — Resend SDK wrapper. `sendEmail({ to, subject, practiceName, body, ctaLabel?, ctaUrl? })`. Full branded HTML template (violet #5B3FD4, DM Sans, responsive). Swallows errors — never crashes requests. Exports `APP_URL` from `NEXT_PUBLIC_APP_URL` env.
- **`lib/notifications/send.ts`** — All trigger functions. `getAdminEmail(practiceId)` returns `{ email, practiceName, prefs }`. `isEnabled(prefs, type)` gates sends (missing key = enabled). `saveNotification()` deduplicates AR alerts by `claimId+type` before insert. Trigger functions: `notifyFailedLogins`, `notifyNewDeviceLogin`, `notifyNewUserAdded`, `notifyRoleChanged`, `notifyMfaDisabled`, `notifyArThreshold`. All respect `isEnabled` preference check.
- **`app/api/cron/ar-alerts/route.ts`** — Protected by `Authorization: Bearer <CRON_SECRET>`. Queries all SUBMITTED/PENDING/APPEALING claims with `submittedAt` set. Decrypts `patientName` via `safeDecrypt()` before extracting initials. Fires 30/60/90-day thresholds and high-value ($500+) alerts. Returns `{ ok, claimsChecked, alertsSent }`.

**Callers wired up:**
- `app/api/auth/credentials-check/route.ts` — fires `notifyFailedLogins()` when ≥3 recent LOGIN+FAILURE audit entries for the email in last 10 min.
- `app/api/auth/verify-mfa/route.ts` — fires `notifyNewDeviceLogin()` on IP change; updates `lastKnownIp` after every successful MFA verification.
- `app/api/users/route.ts` — fires `notifyNewUserAdded()` after user creation.
- `app/api/users/[id]/route.ts` — fires `notifyRoleChanged()` on role changes, `notifyMfaDisabled()` when `mfaEnabled` set to false.

**Env vars to add to `.env.local`:**
```
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
CRON_SECRET=<random secret>
```

---

### 2026-04-01 — Notification Preferences UI

Per-practice opt-in/out controls for all 9 notification types. Admin-only.

- **`app/api/settings/notifications/route.ts`** (new) — `GET` returns `practice.notificationPrefs ?? {}`; `PATCH` merges provided keys. Both admin-only via `protect(req, ['ADMIN'])`.
- **`components/settings/NotificationPreferencesCard.tsx`** (new) — Client component. 9 notification definitions grouped into Security / Team Activity / AR & Collections. Each row: icon, label, toggle switch (optimistic update + revert on failure), one-line summary, expandable detail panel. Missing keys treated as enabled (default on). Toggles PATCH `/api/settings/notifications`.
- **`app/(dashboard)/settings/page.tsx`** — replaced stub card with `<NotificationPreferencesCard />` inside `{isAdmin && ...}`.

---

### 2026-04-19 — Header role-gating + pagination fix + migration fix + Vercel prep

- **Header buttons role-gated** (`components/layout/Header.tsx`) — Bell (notifications) and User (practice) icon buttons now hidden for BILLER role; visible only for ADMIN, OFFICE_MANAGER, SUPER_ADMIN. Uses `useSession()` to read role from JWT.
- **Seed fixed** (`prisma/seed.ts`) — demo@claimguard.ai now seeded as SUPER_ADMIN (was defaulting to ADMIN).
- **Note:** After schema changes with no migration, Turbopack caches stale component — must `rm -rf .next` and restart to pick up Header changes.

### 2026-04-19 — Pagination fix + migration fix + Vercel prep

- **`listAppeals()` paginated** (`lib/db/appeals.ts`) — now accepts `limit`/`offset`, runs parallel count, returns `{ appeals, total }`. API route (`app/api/appeals/route.ts`) reads `?limit=` and `?offset=` from query string. Appeals page updated to destructure `data.appeals`.
- **Missing `deletedAt` migration created** (`prisma/migrations/20260419000000_add_claim_soft_delete/`) — `deletedAt DateTime?` was in the schema but had no migration, causing seed to fail with `P2022`. Migration also adds `ProviderCredential` unique constraint.
- **Vercel deployment prep** — `package.json` build script updated to `prisma generate && next build`. `vercel.json` created with nightly AR alerts cron (`0 2 * * *`).

---

## Known State / To-Do

- Database needs to be set up before the app will work: `docker run` for PostgreSQL → `npx prisma migrate deploy` → `npx prisma db seed`
- `.env.local` needs a real `ANTHROPIC_API_KEY` for AI features to work
- `ENCRYPTION_KEY` must be set in `.env.local` before seeding or creating any claims
- **Pending migration:** Run `npx prisma migrate dev --name add-notifications` to apply Notification model, NotificationType enum, User.lastKnownIp, Practice.notificationPrefs
- **Pending env vars:** Add `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `NEXT_PUBLIC_APP_URL`, `CRON_SECRET` to `.env.local`
- No mobile navigation component built yet (MobileNav.tsx stub not created)
- Prisma 7 `prisma.config.ts` pattern used instead of classic `.env` datasource URL

---

## Architecture Decisions

| Decision | Reason |
|---|---|
| Next.js 16 instead of 14 | `create-next-app` installs latest by default |
| Tailwind v4 CSS-first config | v4 dropped `tailwind.config.ts` for CSS variables |
| `proxy.ts` instead of `middleware.ts` | Next.js 16 convention change |
| `@prisma/adapter-pg` required | Prisma 7 breaking change — requires driver adapters |
| `sonner` instead of `toast` | shadcn v4 deprecated the toast component |
| JWT sessions | No database session overhead; simpler for MVP |
| Server component dashboard | Real DB data without client-side fetch waterfall |
| Static knowledge base over vector DB | No infrastructure needed; deterministic injection; fast; sufficient for finite CDT/payer rule set |
| `force-dynamic` + `staleTimes.dynamic: 0` | Two-layer fix required to prevent stale KPI data on dashboard |
| Turbopack cache must be deleted after migrations | Turbopack caches Prisma client in `.next`; `prisma generate` alone does not invalidate it |
