# ClaimGuard AI — Dental Claim Denial Predictor & Auto-Appeal Engine
## CLAUDE.md — Full Project Blueprint for Claude Code

---

## ⚠️ Claude Startup & Completion Rules

**BEFORE starting any task:**
1. Read `RETROSPECTIVE.md` to understand current project state, what has been built, known issues, and architecture decisions.

**AFTER completing any task:**
1. Update `RETROSPECTIVE.md` immediately — add the date, what was built/changed, any new decisions made, and update the "Known State / To-Do" section.
2. Never leave RETROSPECTIVE.md outdated.

---

## 🎯 Project Overview

Build a production-ready SaaS MVP called **Vindica** — an AI-powered dental insurance claim denial predictor and auto-appeal generator for independent dental practices.

**Core value prop:** Scan every claim before submission, score denial risk, flag documentation gaps, suggest optimal CDT codes, and auto-generate payer-specific appeal letters when denials happen.

---

## 🏗️ Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router, TypeScript) |
| Styling | Tailwind CSS + shadcn/ui |
| Auth | NextAuth.js v5 (credentials + magic link) |
| ORM | Prisma |
| Database | PostgreSQL (via local Docker or Supabase) |
| AI | Anthropic Claude API (`claude-sonnet-4-20250514`) |
| File parsing | pdf-parse + papaparse (CSV) |
| Email | Resend (for magic link auth) |
| Charts | Recharts |
| Deployment | Vercel-ready |

---

## 📁 Project Structure

```
vindica/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx                  # Sidebar + header shell
│   │   ├── dashboard/page.tsx          # Overview + KPI cards
│   │   ├── claims/
│   │   │   ├── page.tsx                # Claims list table
│   │   │   ├── new/page.tsx            # Submit new claim form
│   │   │   └── [id]/page.tsx           # Claim detail + AI analysis
│   │   ├── appeals/
│   │   │   ├── page.tsx                # Appeals list
│   │   │   └── [id]/page.tsx           # Appeal letter view + editor
│   │   ├── payers/page.tsx             # Payer intelligence database
│   │   └── settings/page.tsx           # Practice settings
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── claims/
│   │   │   ├── route.ts                # GET (list) + POST (create)
│   │   │   └── [id]/
│   │   │       ├── route.ts            # GET single claim
│   │   │       └── analyze/route.ts   # POST: run AI analysis
│   │   ├── appeals/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       └── generate/route.ts  # POST: generate appeal letter
│   │   └── payers/route.ts
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                             # shadcn/ui components
│   ├── claims/
│   │   ├── ClaimForm.tsx
│   │   ├── ClaimTable.tsx
│   │   ├── ClaimCard.tsx
│   │   ├── DenialRiskBadge.tsx
│   │   └── ClaimAnalysisPanel.tsx
│   ├── appeals/
│   │   ├── AppealLetterEditor.tsx
│   │   └── AppealStatusBadge.tsx
│   ├── dashboard/
│   │   ├── KPICard.tsx
│   │   ├── DenialTrendChart.tsx
│   │   ├── PayerBreakdownChart.tsx
│   │   └── RecentClaimsWidget.tsx
│   └── layout/
│       ├── Sidebar.tsx
│       ├── Header.tsx
│       └── MobileNav.tsx
├── lib/
│   ├── ai/
│   │   ├── claim-analyzer.ts           # Core AI denial risk scoring
│   │   ├── appeal-generator.ts         # Appeal letter generation
│   │   ├── cdt-optimizer.ts            # CDT code suggestions
│   │   └── prompts.ts                  # All AI system prompts
│   ├── db/
│   │   └── index.ts                    # Prisma client singleton
│   ├── auth.ts                         # NextAuth config
│   ├── utils.ts
│   └── constants.ts                    # CDT codes, payer list, denial reasons
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                         # Seed with mock payer data + sample claims
├── types/
│   └── index.ts                        # Shared TypeScript types
├── .env.example
└── package.json
```

---

## 🗃️ Database Schema (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  password      String?   // hashed
  practice      Practice?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Practice {
  id            String    @id @default(cuid())
  name          String
  npi           String?
  address       String?
  state         String?
  userId        String    @unique
  user          User      @relation(fields: [userId], references: [id])
  claims        Claim[]
  createdAt     DateTime  @default(now())
}

model Claim {
  id                String        @id @default(cuid())
  practiceId        String
  practice          Practice      @relation(fields: [practiceId], references: [id])
  
  // Patient info
  patientName       String
  patientDob        DateTime
  patientInsuranceId String
  
  // Payer info
  payerId           String
  payerName         String
  planType          String?       // PPO, HMO, DMO, etc.
  
  // Claim details
  claimDate         DateTime
  serviceDate       DateTime
  cdtCodes          String[]      // Array of CDT procedure codes
  diagnosisCodes    String[]
  totalAmount       Float
  
  // Status
  status            ClaimStatus   @default(PENDING)
  submittedAt       DateTime?
  
  // AI Analysis
  denialRiskScore   Float?        // 0-100
  riskLevel         RiskLevel?
  aiAnalysis        Json?         // Full AI response stored as JSON
  flaggedIssues     String[]
  suggestedCdtCodes String[]
  
  // Denial tracking
  deniedAt          DateTime?
  denialReason      String?
  denialCode        String?
  
  appeal            Appeal?
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
}

model Appeal {
  id              String        @id @default(cuid())
  claimId         String        @unique
  claim           Claim         @relation(fields: [claimId], references: [id])
  
  letterContent   String        @db.Text
  generatedAt     DateTime      @default(now())
  status          AppealStatus  @default(DRAFT)
  submittedAt     DateTime?
  resolution      String?
  resolvedAt      DateTime?
  amountRecovered Float?
  
  updatedAt       DateTime      @updatedAt
}

model Payer {
  id              String    @id @default(cuid())
  payerId         String    @unique  // Industry payer ID
  name            String
  state           String?
  
  // AI-learned intelligence
  denialRate      Float?    // Historical denial rate for this payer
  avgProcessDays  Int?
  commonDenialReasons String[]
  preferredCdtVariants Json?   // Payer-specific CDT preferences
  requiresPreAuth  String[]  // CDT codes that need pre-auth for this payer
  documentationQuirks String[]
  
  updatedAt       DateTime  @updatedAt
  createdAt       DateTime  @default(now())
}

enum ClaimStatus {
  DRAFT
  PENDING
  SUBMITTED
  APPROVED
  DENIED
  APPEALING
  APPEAL_WON
  APPEAL_LOST
  CLOSED
}

enum RiskLevel {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum AppealStatus {
  DRAFT
  SUBMITTED
  WON
  LOST
}
```

---

## 🤖 AI Module Specifications

### 1. Claim Analyzer (`lib/ai/claim-analyzer.ts`)

This is the core AI engine. When a claim is submitted, call the Anthropic API with:

**System prompt focus:**
- You are an expert dental insurance billing specialist with 20+ years of experience
- You know every payer's quirks, CDT coding nuances, and documentation requirements
- Analyze the claim and return structured JSON with denial risk scoring

**Function signature:**
```typescript
export async function analyzeClaim(claim: ClaimInput, payerIntelligence: PayerData | null): Promise<ClaimAnalysis>
```

**Input:** Claim details (CDT codes, payer, service type, patient plan type, amounts)

**Output JSON structure (parse from Claude's response):**
```json
{
  "denialRiskScore": 72,
  "riskLevel": "HIGH",
  "riskFactors": [
    {
      "factor": "Missing periodontal charting for D4341",
      "severity": "high",
      "recommendation": "Attach 6-point perio chart dated within 6 months of service"
    },
    {
      "factor": "Payer Anthem BCBS typically requires X-rays for crown procedures",
      "severity": "medium", 
      "recommendation": "Include periapical X-ray from within 12 months"
    }
  ],
  "cdtCodeAnalysis": [
    {
      "code": "D2740",
      "issue": "Porcelain crown — verify this payer covers all-ceramic vs PFM",
      "alternativeCode": "D2750",
      "rationale": "Delta Dental plans in TX often default to PFM coverage"
    }
  ],
  "missingDocumentation": [
    "Pre-operative X-rays",
    "Periodontal chart",
    "Narrative explaining medical necessity"
  ],
  "payerSpecificWarnings": [
    "This payer has a 12-month frequency limitation on prophylaxis (D1110)"
  ],
  "recommendedActions": [
    "Add narrative: explain why crown was necessary vs alternative treatment",
    "Verify pre-authorization was obtained for D6010"
  ],
  "estimatedCleanClaimProbability": 28,
  "summary": "High denial risk due to missing documentation and potential frequency conflict..."
}
```

### 2. Appeal Generator (`lib/ai/appeal-generator.ts`)

**Function signature:**
```typescript
export async function generateAppealLetter(claim: Claim, denialReason: string, payerIntelligence: PayerData | null): Promise<string>
```

**System prompt focus:**
- Generate professional, targeted dental insurance appeal letters
- Cite specific policy language, clinical guidelines (ADA, AAP), and relevant case law
- Tailor tone and structure to the specific payer
- Include: patient info header, denial reference number placeholder, clinical justification, supporting documentation list, regulatory references (ERISA if applicable), and closing demand

**The letter should:**
- Be 400–700 words
- Lead with the strongest clinical argument first
- Reference ADA clinical practice guidelines where relevant
- Include a placeholder table: `[SUPPORTING DOCUMENTATION ENCLOSED: List items]`
- End with a firm but professional demand for reconsideration within 30 days

### 3. CDT Optimizer (`lib/ai/cdt-optimizer.ts`)

Standalone function to analyze a list of CDT codes before claim submission and suggest optimizations. Returns alternative codes that are more likely to be approved by the specific payer.

---

## 📊 Dashboard Page Specifications

**KPI Cards (top row):**
1. Claims This Month — total submitted
2. Denial Rate — % denied (vs industry avg 13%)
3. Revenue at Risk — sum of denied claim amounts
4. Recovered via Appeals — total appeal wins this month

**Charts:**
1. **Denial Trend** (line chart, 6 months) — monthly denial rate
2. **Top Denial Reasons** (horizontal bar chart) — grouped by denial reason
3. **Payer Performance Table** — payer name | claims submitted | denial rate | avg process days

**Recent Claims Widget:**
- Last 10 claims with status badges and risk scores
- Quick action: "Analyze" button for unanalyzed claims

---

## 📋 Claims List Page Specifications

**Table columns:**
- Patient Name | Payer | CDT Codes | Amount | Service Date | Status | Risk Score | Actions

**Filters:**
- Status (All / Pending / Denied / Approved / Appealing)
- Risk Level (All / Low / Medium / High / Critical)
- Payer (dropdown)
- Date range

**Row actions:**
- View Details
- Run AI Analysis (if not yet analyzed)
- Generate Appeal (if denied)

---

## 📝 New Claim Form Specifications

**Form fields:**

Section 1 — Patient Info:
- Patient name, DOB, Insurance Member ID

Section 2 — Payer Info:
- Payer (searchable dropdown from Payer table), Plan Type (PPO/HMO/DMO/Medicaid/Medicare)

Section 3 — Claim Details:
- Service Date, Claim Date
- CDT Codes (dynamic multi-input, user can add up to 15 codes)
- Diagnosis codes (ICD-10)
- Total Claim Amount

Section 4 — Documentation Checklist:
- Checkboxes: X-rays attached, Periodontal chart, Pre-auth obtained, Narrative included

**On submit:**
1. Save claim to DB with status DRAFT
2. Immediately trigger AI analysis (call `/api/claims/[id]/analyze`)
3. Redirect to claim detail page showing analysis results

---

## 🔍 Claim Detail Page Specifications

**Layout:** Two-column
- Left: Claim summary card + status timeline
- Right: AI Analysis Panel

**AI Analysis Panel sections:**
1. **Risk Score Gauge** — visual circular gauge showing 0-100 score, color-coded
2. **Risk Factors** — accordion list, each factor has severity badge + recommendation
3. **CDT Code Review** — table showing each submitted code with AI notes
4. **Missing Documentation** — checklist with checkboxes (user can check off as they add docs)
5. **Payer-Specific Warnings** — callout cards
6. **Recommended Actions** — numbered action list

**Action buttons:**
- "Re-analyze Claim" (re-runs AI)
- "Mark as Submitted"
- "Record Denial" (opens modal to enter denial reason/code)
- "Generate Appeal Letter" (available after denial recorded)

---

## ✉️ Appeal Letter Page Specifications

**Layout:**
- Left panel: Claim context + denial info
- Right panel: Generated appeal letter in rich text editor (use a simple textarea or TipTap)

**Features:**
- "Regenerate" button (re-calls AI with same inputs)
- "Copy to Clipboard"
- "Download as PDF" (use window.print() or a simple PDF generation)
- Status tracker: Draft → Submitted → Won/Lost
- "Mark as Submitted" button
- "Record Resolution" button (opens modal: Won/Lost + amount recovered)

---

## 🏦 Payer Intelligence Page

**Table showing all tracked payers:**
- Payer Name | State | Denial Rate | Common Denial Reasons | Pre-Auth Required For | Last Updated

**Each payer row expandable** to show:
- Documentation quirks
- CDT code preferences
- Tips from AI analysis history

---

## 🔐 Auth Specifications

Use **NextAuth.js v5** with:
1. **Credentials provider** (email + password with bcrypt hashing)
2. Session strategy: JWT

**Auth flow:**
- `/login` — email + password form
- `/register` — name + email + password + practice name
- On register: create User + Practice in one transaction
- Protect all `/dashboard/*` routes via middleware

**Middleware (`middleware.ts`):**
```typescript
// Redirect unauthenticated users to /login
// Redirect authenticated users away from /login and /register
```

---

## 🌱 Seed Data (`prisma/seed.ts`)

Seed the following:

**1. Demo user:**
- Email: `demo@vindica.ai`
- Password: `demo1234`
- Practice: "Sunshine Family Dentistry" — Dallas, TX

**2. Payers (at minimum these 8):**
```
Delta Dental | Anthem BCBS | Cigna | Aetna | United Concordia | MetLife | Guardian | Humana
```

For each payer, include realistic mock data:
- denialRate (8–22%)
- commonDenialReasons (2–4 reasons each)
- requiresPreAuth (relevant CDT codes)
- documentationQuirks (1–3 quirks)

**3. Sample claims (15 total):**
- Mix of statuses: PENDING, SUBMITTED, APPROVED, DENIED, APPEALING, APPEAL_WON
- Varying risk levels and CDT codes
- At least 3 denied claims with generated appeals
- Use realistic CDT codes: D0120, D0210, D1110, D2140, D2740, D2750, D4341, D4342, D6010, D7140, D7210

---

## 🎨 Design System

**Brand:** Vindica — clean, clinical, premium health-tech SaaS aesthetic. Violet-forward, confident, trustworthy.

**Color palette (use these exact values as CSS variables in `globals.css` and Tailwind config):**
```css
/* globals.css */
:root {
  --primary: #5B3FD4;          /* Violet — primary actions, brand */
  --primary-light: #8B72E8;    /* Lavender — hover states, accents */
  --primary-mist: #E8E4FF;     /* Mist — subtle backgrounds, pills */
  --midnight: #1A1033;         /* Midnight — sidebar, dark surfaces */
  --ghost: #F0EEFF;            /* Ghost — page background tint */
  --mint: #3BBFB0;             /* Mint — positive indicators, success */
  --white: #F8F7FF;            /* Off-white — card backgrounds */
  --danger: #DC2626;           /* Red — high risk, errors */
  --warning: #D97706;          /* Amber — medium risk, warnings */
  --border: #E8E6F0;           /* Subtle border */
}
```

**Tailwind config — extend colors:**
```js
colors: {
  primary: '#5B3FD4',
  'primary-light': '#8B72E8',
  'primary-mist': '#E8E4FF',
  midnight: '#1A1033',
  ghost: '#F0EEFF',
  mint: '#3BBFB0',
}
```

**Typography (add to `globals.css` via Google Fonts import):**
```css
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&display=swap');

:root {
  --font-display: 'Trebuchet MS', 'Segoe UI', sans-serif; /* Wordmark, headings */
  --font-body: 'DM Sans', system-ui, sans-serif;           /* All UI, body copy */
}

body {
  font-family: var(--font-body);
  background-color: var(--white);
  color: var(--midnight);
}
```

**Logo mark (use in `Sidebar.tsx` and auth pages):**
The Vindica logo mark is a medical cross shape made from two overlapping pill-shaped rounded rectangles with a filled circle center and four small dot accents. Render it as an inline SVG component:

```tsx
// components/layout/VindicaMark.tsx
export function VindicaMark({ size = 32 }: { size?: number }) {
  const s = size;
  const h = s * 0.267; // bar height ~32% of size
  const r = h / 2;
  return (
    <svg width={s} height={s} viewBox="0 0 120 120" fill="none">
      {/* Horizontal bar */}
      <rect x="0" y="44" width="120" height="32" rx="16"
            fill="#5B3FD4" fillOpacity="0.15"
            stroke="#5B3FD4" strokeWidth="1.5" strokeOpacity="0.5"/>
      {/* Vertical bar */}
      <rect x="44" y="0" width="32" height="120" rx="16"
            fill="#5B3FD4" fillOpacity="0.15"
            stroke="#5B3FD4" strokeWidth="1.5" strokeOpacity="0.5"/>
      {/* Center dot */}
      <circle cx="60" cy="60" r="14" fill="#5B3FD4"/>
      {/* Four accent dots */}
      <circle cx="12"  cy="60" r="5" fill="#5B3FD4" fillOpacity="0.35"/>
      <circle cx="108" cy="60" r="5" fill="#5B3FD4" fillOpacity="0.35"/>
      <circle cx="60"  cy="12" r="5" fill="#5B3FD4" fillOpacity="0.35"/>
      <circle cx="60"  cy="108" r="5" fill="#5B3FD4" fillOpacity="0.35"/>
    </svg>
  );
}
```

**Full wordmark (for auth pages and marketing):**
```tsx
// components/layout/VindicaLogo.tsx
export function VindicaLogo() {
  return (
    <div className="flex flex-col items-center gap-3">
      <VindicaMark size={80} />
      <div className="text-center">
        <h1 style={{ fontFamily: 'Trebuchet MS, Segoe UI, sans-serif' }}
            className="text-5xl font-bold tracking-tight text-midnight">
          Vindi<span className="text-primary">ca</span>
        </h1>
        <p className="text-xs tracking-[0.3em] text-primary/55 mt-1">
          INTELLIGENT CLAIMS RECOVERY
        </p>
        <div className="w-32 h-px bg-primary/20 mx-auto my-3"/>
        <p className="text-sm font-light text-midnight/40 tracking-wide">
          Reclaim what is rightfully yours.
        </p>
      </div>
    </div>
  );
}
```

**Sidebar appearance:**
- Background: `bg-midnight` (#1A1033)
- Active nav item: `bg-primary` pill with white text
- Inactive nav items: white text at 45% opacity
- Logo area: VindicaMark (dark variant — swap fill to #8B72E8) + "Vindi**ca**" in white/lavender

**Dark variant mark for sidebar (swap primary to lavender):**
Replace `fill="#5B3FD4"` with `fill="#8B72E8"` and update `stroke` to `#8B72E8` in the sidebar instance.

**Risk score color coding:**
- 0–30: Mint `#3BBFB0` — LOW
- 31–60: Amber `#D97706` — MEDIUM  
- 61–80: Orange `#EA580C` — HIGH
- 81–100: Red `#DC2626` — CRITICAL

**Risk pill component:**
```tsx
const riskColors = {
  LOW:      'bg-[#E0F5F3] text-[#3BBFB0]',
  MEDIUM:   'bg-amber-50 text-amber-600',
  HIGH:     'bg-orange-50 text-orange-600',
  CRITICAL: 'bg-red-50 text-red-600',
}
```

**Sidebar nav items (with Lucide icons):**
- Dashboard (LayoutDashboard)
- Claims (FileText)
- Appeals (Mail)
- Payer Intelligence (Building2)
- Settings (Settings)

---

## ⚙️ Environment Variables

```bash
# .env.local

DATABASE_URL="postgresql://postgres:password@localhost:5432/vindica"

NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

ANTHROPIC_API_KEY="sk-ant-..."
```

---

## 🚀 Build Order (Follow This Exactly)

Build the project in this sequence:

### Phase 1 — Foundation
1. Initialize Next.js 14 project with TypeScript and Tailwind
2. Install all dependencies (see below)
3. Set up Prisma schema and run migrations
4. Configure NextAuth.js with credentials provider
5. Create middleware for route protection
6. Build the auth pages (login + register) with full validation

### Phase 2 — Layout & Shell
7. Build sidebar layout with navigation
8. Build dashboard shell (header, sidebar, main content area)
9. Create shared UI components (KPICard, StatusBadge, RiskBadge)

### Phase 3 — Core Data
10. Implement claims list page with table, filters, and pagination
11. Implement new claim form with all sections and validation
12. Implement claim detail page layout

### Phase 4 — AI Engine
13. Build `lib/ai/prompts.ts` with all system prompts
14. Build `lib/ai/claim-analyzer.ts` with Anthropic API integration
15. Build `lib/ai/appeal-generator.ts`
16. Wire up `/api/claims/[id]/analyze` endpoint
17. Wire up `/api/appeals/[id]/generate` endpoint

### Phase 5 — AI UI
18. Build ClaimAnalysisPanel component with risk gauge, factors, CDT review
19. Build appeal letter page with editor and actions
20. Connect all AI results to UI

### Phase 6 — Intelligence & Polish
21. Build Payer Intelligence page
22. Build dashboard with real data (KPI cards + charts)
23. Seed database with realistic demo data
24. Final polish: loading states, error handling, empty states, toast notifications

---

## 📦 Dependencies to Install

```bash
npx create-next-app@latest vindica --typescript --tailwind --eslint --app --src-dir=false

cd vindica

# Core
npm install @prisma/client prisma
npm install next-auth@beta @auth/prisma-adapter
npm install @anthropic-ai/sdk

# UI
npx shadcn@latest init
npx shadcn@latest add button card input label badge table dialog sheet tabs accordion toast progress select checkbox form

# Additional UI
npm install lucide-react recharts
npm install clsx tailwind-merge class-variance-authority

# Forms & validation  
npm install react-hook-form @hookform/resolvers zod

# Utilities
npm install bcryptjs
npm install @types/bcryptjs --save-dev
npm install date-fns

# PDF/file
npm install pdf-parse papaparse
npm install @types/pdf-parse @types/papaparse --save-dev
```

---

## 🔑 Key Implementation Notes

### Anthropic API Call Pattern
Always use streaming for the appeal letter generation (feels faster for long text). Use regular completion for claim analysis (need structured JSON).

```typescript
// For claim analysis — structured JSON response
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const response = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 2000,
  messages: [{ role: 'user', content: claimAnalysisPrompt }],
  system: CLAIM_ANALYZER_SYSTEM_PROMPT,
});

// Parse JSON from response
const analysisText = response.content[0].type === 'text' ? response.content[0].text : '';
const analysis = JSON.parse(analysisText);
```

### Prisma Client Singleton
```typescript
// lib/db/index.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### Error Handling
- All API routes: wrap in try/catch, return consistent `{ error: string }` on failure
- AI failures: return a graceful degraded response, never crash the UI
- Show toast notifications for all async actions (success + error)

### Loading States
- Claim analysis: show skeleton loader for the analysis panel while AI runs
- Appeal generation: show streaming text effect (poll or use Server-Sent Events)
- Tables: show skeleton rows on initial load

---

## ✅ Definition of Done

The MVP is complete when:
- [ ] User can register a practice and log in
- [ ] User can create a new claim with all required fields
- [ ] AI analyzes the claim and returns risk score + factors within 10 seconds
- [ ] Dashboard shows real KPIs from the database
- [ ] User can record a denial and generate an appeal letter
- [ ] Appeal letter is professional, payer-specific, and editable
- [ ] Payer intelligence page shows aggregated payer data
- [ ] Demo user + seed data loads cleanly with `npx prisma db seed`
- [ ] App runs without errors on `npm run dev`
- [ ] All routes are protected — unauthenticated users redirected to login

---

## 🧪 How to Run After Build

```bash
# 1. Start PostgreSQL (Docker recommended)
docker run --name vindica-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=vindica -p 5432:5432 -d postgres

# 2. Copy env file
cp .env.example .env.local
# Edit .env.local with your ANTHROPIC_API_KEY

# 3. Set up database
npx prisma migrate dev --name init
npx prisma db seed

# 4. Run dev server
npm run dev

# 5. Open http://localhost:3000
# Login: demo@vindica.ai / demo1234
```
