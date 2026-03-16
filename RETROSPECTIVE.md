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

### 2026-03-16 — Login page cleanup & env cleanup

- **app/(auth)/login/page.tsx** — removed demo credentials hint box (`Demo: demo@claimguard.ai / demo1234`), updated email input placeholder from `demo@claimguard.ai` to `you@example.com`
- **.env.example** — deleted (user has real API key in `.env.local`)
- **.claude/settings.local.json** — added `UserPromptSubmit` hook to auto-inject RETROSPECTIVE.md at start of every conversation

---

## Known State / To-Do

- Database needs to be set up before the app will work: `docker run` for PostgreSQL → `npx prisma migrate dev` → `npx prisma db seed`
- `.env.local` needs a real `ANTHROPIC_API_KEY` for AI features to work
- Settings page is a stub (no functionality yet)
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
