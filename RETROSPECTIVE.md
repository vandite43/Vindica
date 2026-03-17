# ClaimGuard AI — Project Retrospective

> **Purpose:** Running log of all work done on this project. Claude must read this before starting any task and update it immediately after completing any task.

---

## Project Identity

- **App name:** ClaimGuard AI (blueprint refers to it as both "Vindica" and "ClaimGuard AI" — the built app uses ClaimGuard AI branding)
- **Stack:** Next.js 16 (App Router, TypeScript), Tailwind v4, NextAuth v5, Prisma 7, PostgreSQL, Anthropic Claude API, shadcn/ui, Recharts
- **Working directory:** `/c/Users/malad/dev/dental-denial`

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
- Created `app/globals.css` — Google Fonts (DM Sans, Instrument Serif), CSS variables, Tailwind base
- Created `app/layout.tsx` — root layout with metadata
- Created `app/page.tsx` — redirects to `/dashboard`
- Created `components/layout/Sidebar.tsx` — navy blue sidebar with Lucide icons and active state
- Created `components/layout/Header.tsx` — top bar with signout button
- Created `app/(dashboard)/layout.tsx` — dashboard shell with sidebar
- Created `app/(auth)/login/page.tsx` — login form with demo credentials hint
- Created `app/(auth)/register/page.tsx` — registration form
- Created `components/claims/DenialRiskBadge.tsx` — color-coded risk badge
- Created `components/appeals/AppealStatusBadge.tsx`

**Phase 3 — Core Data Pages**
- Created `app/(dashboard)/claims/page.tsx` — claims table with status/risk/search filters, skeleton loading, action buttons
- Created `app/(dashboard)/claims/new/page.tsx` — multi-section form: patient info, payer selection, CDT code multi-input (up to 15), diagnosis codes, documentation checklist; auto-triggers AI analysis on submit
- Created `app/(dashboard)/claims/[id]/page.tsx` — two-column layout: claim summary + AI analysis panel, denial modal, appeal generation flow

**Phase 4 — AI Engine**
- Created `lib/ai/prompts.ts` — system prompts for claim analyzer, appeal generator, CDT optimizer
- Created `lib/ai/claim-analyzer.ts` — calls `claude-sonnet-4-20250514`, returns structured JSON risk assessment with graceful degradation on failure
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

---

### 2026-03-16 — Branding fix: Vindica Design System applied

- **globals.css** — replaced all old oklch/blue variables with exact Vindica hex palette: `--primary: #5B3FD4`, `--midnight: #1A1033`, `--mint: #3BBFB0`, `--ghost: #F0EEFF`, `--primary-light: #8B72E8`, `--primary-mist: #E8E4FF`, `--white: #F8F7FF`, `--danger: #DC2626`, `--warning: #D97706`, `--border: #E8E6F0`. Added `--font-display` and `--font-body` vars. Updated body to use `var(--font-body)` and `var(--white)` background, `var(--midnight)` text. DM Sans font only (removed Instrument Serif). Tailwind `@theme inline` block extended with `--color-primary`, `--color-midnight`, `--color-mint`, `--color-ghost`, `--color-primary-light`, `--color-primary-mist`.
- **components/layout/VindicaMark.tsx** — created exact SVG from spec: medical cross from two pill rects + center circle + 4 accent dots. Supports `variant="default"` (fill #5B3FD4) and `variant="dark"` (fill #8B72E8) for sidebar.
- **components/layout/VindicaLogo.tsx** — created full wordmark: VindicaMark(80) + "Vindi**ca**" in Trebuchet MS + tagline + divider + subtitle, exactly as spec.
- **components/layout/Sidebar.tsx** — rebuilt: `bg-midnight (#1A1033)`, VindicaMark dark variant (lavender #8B72E8), "Vindi**ca**" wordmark in white/lavender, active nav pill uses `bg-primary (#5B3FD4)` white text, inactive nav uses `rgba(255,255,255,0.45)`. Removed Shield icon and all old blue colors.
- **lib/constants.ts RISK_COLORS** — updated to spec: LOW=`bg-[#E0F5F3] text-[#3BBFB0]`, MEDIUM=`bg-amber-50 text-amber-600`, HIGH=`bg-orange-50 text-orange-600`, CRITICAL=`bg-red-50 text-red-600`.
- **app/(auth)/login/page.tsx** — background now midnight (#1A1033), uses VindicaLogo, buttons/links use #5B3FD4, demo hint uses primary-mist bg.
- **app/(auth)/register/page.tsx** — same pattern, uses VindicaMark(56), Trebuchet MS title.
- **Payer page fix** — also fixed `<tbody>` nested in `<tbody>` hydration error (replaced with React.Fragment).

---

### 2026-03-16 — Switch AI model to Haiku 4.5

- All three AI modules (`claim-analyzer.ts`, `appeal-generator.ts`, `cdt-optimizer.ts`) updated from `claude-sonnet-4-20250514` to `claude-haiku-4-5-20251001`

---

### 2026-03-16 — Claim edit functionality

- **app/(dashboard)/claims/[id]/edit/page.tsx** — new edit page: pre-populates all claim fields from the API, PATCHes on save, redirects back to detail page
- **app/(dashboard)/claims/[id]/page.tsx** — added Edit Claim button (with Pencil icon) to action bar, visible only when claim status is DRAFT or PENDING

---

### 2026-03-16 — Fix denial risk gauge centering

- **app/(dashboard)/claims/[id]/page.tsx** — replaced broken CSS clip-path gauge with proper SVG `<path>` arc using `strokeDasharray`/`strokeDashoffset`. Arc now renders perfectly centered inside the card at all times.

---

### 2026-03-17 — Restore localhost:3000, restart app

- `.env.local` — reverted `NEXTAUTH_URL` back to `http://localhost:3000`
- Killed all node processes and restarted `npm run dev` on port 3000

---

### 2026-03-17 — Add spacing in CDT Code Review table

- **app/(dashboard)/claims/[id]/page.tsx** — added `pr-6` to Code and Issue columns so text doesn't run together

---

### 2026-03-17 — Fix risk factor text truncation

- **app/(dashboard)/claims/[id]/page.tsx** — removed `truncate` class and `min-w-0` from risk factor row so full sentence displays instead of cutting off with "..."

---

### 2026-03-17 — Fix router cache causing stale dashboard KPIs

- **next.config.ts** — added `experimental.staleTimes.dynamic = 0` to disable the Next.js client-side router cache for dynamic pages. Without this, navigating to /dashboard via the sidebar served a cached page for up to 30 seconds even though the server data was fresh.

---

### 2026-03-17 — Fix Revenue at Risk not updating on dashboard

- **app/(dashboard)/dashboard/page.tsx** — added `export const dynamic = 'force-dynamic'` to prevent Next.js from caching the server component. Without this, KPIs (Revenue at Risk, denial rate, etc.) showed stale values after claim updates.

---

### 2026-03-17 — Show new fields on claim detail page

- **app/(dashboard)/claims/[id]/page.tsx** — added to Claim interface: `toothNumbers`, `providerNpi`, `preAuthNumber`, doc booleans. Summary card now shows: tooth number pills (purple), provider NPI, pre-auth number, and a documentation row with green ✓ / gray ✗ badges for all four doc flags.

---

### 2026-03-17 — Clear stale Prisma client after tooth/NPI/preauth migration

- Killed node, deleted `.next`, ran `prisma generate`, restarted dev server
- **Rule:** After every schema migration, always run `rm -rf .next && npx prisma generate` before restarting — Turbopack caches the old Prisma client and will throw `PrismaClientValidationError` for any new fields until cleared

---

### 2026-03-17 — Sync edit claim page with new claim form

- **app/(dashboard)/claims/[id]/edit/page.tsx** — added all three new fields missing from edit form: tooth numbers multi-input, provider NPI field, conditional pre-auth number input. All fields load from API on mount and are sent in the PATCH body, flowing through to AI analysis on re-analyze.

---

### 2026-03-17 — Add tooth numbers, provider NPI, pre-auth number

- **prisma/schema.prisma** — added `toothNumbers String[]`, `providerNpi String?`, `preAuthNumber String?` to Claim model
- **migration** — `20260317032114_add_tooth_provider_preauth`
- **types/index.ts** — added three fields to `ClaimInput`
- **lib/ai/claim-analyzer.ts** — prompt now includes tooth numbers, provider NPI, and pre-auth number so AI can flag missing tooth numbers for procedures like D2740, D4341, D6010
- **app/api/claims/[id]/analyze/route.ts** — passes new fields to `analyzeClaim()`
- **app/api/claims/[id]/route.ts** — PATCH route handles saving all three fields
- **app/(dashboard)/claims/new/page.tsx** — Tooth Numbers multi-input below CDT Codes; Treating Provider NPI in Patient Information; Pre-auth Number input revealed conditionally when pre-auth checkbox is checked
- `.next` cache cleared after migration

---

### 2026-03-16 — Move AI model selector to Settings only

- Removed inline model dropdown from claim detail page and appeals page
- Model is now read silently from localStorage via `getStoredModel()` on both pages
- Settings page remains the only place to change the model

---

### 2026-03-16 — Fix AI not seeing documentation checklist

- **app/api/claims/[id]/analyze/route.ts** — the four doc fields (`xraysAttached`, `perioCharting`, `preAuthObtained`, `narrativeIncluded`) existed in `ClaimInput` type but were never passed from the route to `analyzeClaim()`. AI always saw them as undefined and couldn't adjust the risk score. Now passed from the DB claim object.

---

### 2026-03-16 — App started

- Ran `npm run dev` in background after clearing `.next` cache — app responding on http://localhost:3000

---

### 2026-03-16 — Clear Turbopack cache after Prisma migration

- Deleted `.next` folder — Turbopack bundles and caches the Prisma client inside `.next/dev/server/chunks/`. Running `prisma generate` updates `node_modules` but Turbopack's cache still serves the old bundle. Must delete `.next` and do a clean `npm run dev` restart after any schema migration.

---

### 2026-03-16 — Fix stale Prisma client after documentation fields migration

- Ran `npx prisma generate` to regenerate the Prisma client after the `add_documentation_fields` migration
- **Root cause:** Turbopack caches the Prisma client in memory; after `prisma migrate dev` the client wasn't rebuilt, so `prisma.claim.update()` threw `PrismaClientValidationError` for unknown fields
- **Fix:** Run `npx prisma generate` then restart the dev server (Ctrl+C → `npm run dev`) after any schema migration

---

### 2026-03-16 — Expose real PATCH error for debugging

- **app/api/claims/[id]/route.ts** — PATCH catch block now returns the actual error message instead of generic "Internal server error"
- **app/(dashboard)/claims/[id]/edit/page.tsx** — alert now shows the real error from the API response

---

### 2026-03-16 — Fix documentation checklist not saving

- **prisma/schema.prisma** — added four Boolean fields to Claim model: `xraysAttached`, `perioCharting`, `preAuthObtained`, `narrativeIncluded` (all default false)
- **prisma/migrations/20260316211903_add_documentation_fields** — migration applied
- **app/api/claims/[id]/route.ts** — PATCH route now accepts and saves the four doc fields
- **app/(dashboard)/claims/[id]/edit/page.tsx** — edit page now loads doc field values from the API on mount and sends them on save

---

### 2026-03-16 — Fix claim edit not saving

- **app/api/claims/[id]/route.ts** — PATCH route was doing `data: body` (raw request body passed directly to Prisma), which fails when the body contains unknown or non-updatable fields. Fixed by explicitly destructuring and mapping only the allowed fields, with `new Date()` coercion for all DateTime columns.

---

### 2026-03-16 — Darken favicon purple

- **app/icon.svg** — changed all purple from `#5B3FD4` to `#3B1FA8` for better visibility in browser tab

---

### 2026-03-16 — Vindica SVG favicon (transparent)

- **app/icon.svg** — Vindica mark on transparent background: two pill rects (fill #5B3FD4 at 15% opacity, stroke at 50%), solid center circle (#5B3FD4), four accent dots (35% opacity). No background rect. Hard refresh (Ctrl+Shift+R) required to see change in browser tab.

---

### 2026-03-16 — Fix browser tab title

- **app/layout.tsx** — changed `title` metadata from `'ClaimGuard AI — Dental Claim Denial Predictor'` to `'Vindica — Dental Claim Denial Predictor'`

---

### 2026-03-16 — Enforce retrospective update after every command

- **.claude/settings.local.json** — added `Stop` hook that fires after every Claude response, echoing a reminder to update RETROSPECTIVE.md. Combined with the existing `UserPromptSubmit` hook (reads the file before each prompt), this creates a full read-on-start / write-on-finish loop.

---

### 2026-03-16 — Login page cleanup & env cleanup

- **app/(auth)/login/page.tsx** — removed demo credentials hint box (`Demo: demo@claimguard.ai / demo1234`), updated email input placeholder from `demo@claimguard.ai` to `you@example.com`
- **.env.example** — deleted (user has real API key in `.env.local`)
- **.claude/settings.local.json** — added `UserPromptSubmit` hook to auto-inject RETROSPECTIVE.md at start of every conversation

---

### 2026-03-16 — AI Model Selector

- **lib/constants.ts** — added `AI_MODELS` array (Haiku 4.5, Sonnet 4.6, Opus 4.6) and `DEFAULT_AI_MODEL = 'claude-haiku-4-5-20251001'`
- **lib/hooks/useAIModel.ts** — new file: `useAIModel()` React hook (reads/writes to `localStorage`), `getStoredModel()` for non-hook contexts
- **lib/ai/claim-analyzer.ts** — added `model` parameter with default to `DEFAULT_AI_MODEL`
- **lib/ai/appeal-generator.ts** — added `model` parameter with default to `DEFAULT_AI_MODEL`
- **app/api/claims/[id]/analyze/route.ts** — reads `model` from request body, passes to `analyzeClaim()`
- **app/api/appeals/[id]/generate/route.ts** — reads `model` from request body, passes to `generateAppealLetter()`
- **app/(dashboard)/settings/page.tsx** — rebuilt as client component with AI Model card: selectable radio-style buttons for each model, persists selection to localStorage via `useAIModel` hook
- **app/(dashboard)/claims/[id]/page.tsx** — added `selectedModel` state (seeded from `getStoredModel()`), compact `<select>` dropdown next to Run Analysis button, model passed in analysis fetch body
- **app/(dashboard)/appeals/[id]/page.tsx** — same pattern: model dropdown next to Regenerate button, model passed in regenerate fetch body

---

### 2026-03-17 — Anti-Hallucination RAG Knowledge Base

Built a structured static knowledge base injected into every AI prompt to ground analysis in real dental billing rules instead of Claude's general training.

**Files created (all under `lib/knowledge/`):**
- **cdt-codes.ts** — CDT code entry for every code in the app (D0120–D7240): description, required documentation checklist, bundling conflicts, frequency limits, pre-auth flag, supporting ICD-10 diagnosis codes
- **payer-policies.ts** — per-payer rules keyed by payerId for all 8 seed payers (Delta Dental, Anthem, Cigna, Aetna, United Concordia, MetLife, Guardian, Humana): frequency rules, coding preferences/downcode risks, documentation requirements, bundling warnings, appeal tips
- **icd10-support.ts** — ICD-10 → CDT support mapping with justification text (K05.x perio codes, K02.x caries, K08.x tooth loss, K04.x pulpal disease, K01.x impactions, Z01.x preventive, S02.x trauma, etc.)
- **clinical-guidelines.ts** — citable ADA/AAP guideline snippets by category (periodontalTherapy, implants, crowns, periodontalMaintenance, extractionCriteria, diagnosticRadiographs) + `CDT_TO_GUIDELINE_MAP` linking codes to relevant guideline categories
- **context-builder.ts** — `buildClaimContext(claim)` and `buildAppealContext(cdtCodes, payerId, denialReason)` assemblers: inject only the CDT, payer policy, diagnosis support, and guideline sections relevant to the specific claim's codes

**Files modified:**
- **lib/ai/claim-analyzer.ts** — imports `buildClaimContext`, appends `[KNOWLEDGE BASE]` block to every claim analysis prompt
- **lib/ai/appeal-generator.ts** — imports `buildAppealContext`, adds `payerId` to `ClaimForAppeal` interface, appends `[KNOWLEDGE BASE]` block (including payer-specific appeal tips) to every appeal generation prompt
- **lib/ai/prompts.ts** — strengthened both system prompts with `CRITICAL INSTRUCTION` blocks instructing Claude to treat injected knowledge as ground truth and prioritize it over general training

**What this prevents:**
- Wrong frequency limits → exact payer rules injected per claim
- Made-up documentation requirements → CDT-specific checklist injected
- Incorrect bundling rules → explicit conflict list per code
- Vague clinical justification → ADA/AAP guideline snippets injected
- Inconsistent appeal arguments → payer-specific appeal tips injected
- Wrong ICD-10 → CDT logic → support matrix injected for claim's diagnosis codes

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
