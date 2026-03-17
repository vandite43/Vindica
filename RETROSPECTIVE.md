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

## Known State / To-Do

- Database needs to be set up before the app will work: `docker run` for PostgreSQL → `npx prisma migrate dev` → `npx prisma db seed`
- `.env.local` needs a real `ANTHROPIC_API_KEY` for AI features to work
- No toast notifications wired up yet (sonner installed but not fully integrated)
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
