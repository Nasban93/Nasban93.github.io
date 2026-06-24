# HotelPulse — Build Brief & Implementation Plan

Companion to *HotelHR_Unified_Platform_Design_Plan.md*. This document is operational: **Part A** is a self-contained brief you paste into a fresh Claude Code session to build the demo; **Part B** is how to actually roll it out in a hotel; **Part C** covers IT & security; **Part D** is the fallback ladder if it's rejected.

> **Workflow guidance (read first — answers your "this chat vs new chat vs Claude Code" question):**
> - **Keep planning in this chat.** It already holds all the design context; use it to refine the plan, the brief, or the pitch.
> - **Build the app in Claude Code (with Sonnet), in a fresh session and a new repo.** Claude Code is purpose-built for multi-file projects: it manages files, runs `npm`, commits to git, runs the dev server, and deploys. Cowork (this chat) is oriented to documents/automation, not iterative app development.
> - **Do not build the app in this chat.** Two reasons: this context is heavy with planning (slower, pricier), and a *cold* Claude Code session that reads a complete brief produces cleaner results than one carrying baggage.
> - **The handoff:** create an empty GitHub repo → open it in Claude Code → paste **Part A** below → let it scaffold and iterate → then do the Pages + domain steps (Part A §10). Part A is written to be understood with zero prior context.

---

# PART A — DEMO BUILD BRIEF (paste into Claude Code)

*Everything below the line is written for an implementer who has never seen this project. Paste from "## Mission" onward.*

---

## Mission

Build **HotelPulse**, a single-page hotel HR platform demo that unifies two ideas on one employee record: (1) an **operational** weighted 0–100 monthly performance KPI per employee, and (2) a **strategic** org-level workforce/Saudization analytics layer. It must run as a **static site** (no backend, no database server), ship with **synthetic demo data**, and deploy free to **GitHub Pages at `binnasban.com/hr`** (path-based: a project repo named `hr` served under the apex domain). Bilingual **English / Arabic (RTL)**.

> **Hosting model (important):** the app lives at **`binnasban.com/hr/`**, NOT a subdomain. This means: Vite `base: "/hr/"`, React Router `basename="/hr"`, a `404.html` SPA fallback (copy of `index.html`) so deep links/refreshes work on Pages, and **no `CNAME` in this repo** — the apex domain `binnasban.com` is owned by the separate `<username>.github.io` root repo; project repos like `hr` automatically appear at `binnasban.com/<repo>/`.

**Demo property (the fictional hotel the data belongs to):** **Najd Crown Hotel & Residences**, Riyadh (Arabic: فندق وأجنحة تاج نجد) — a flagship luxury hotel + serviced residences. Use this name in the app header/branding, page title, and seed data. It is fictional; pair it with the visible "synthetic data" banner. Do not confuse it with **HotelPulse**, which is the *platform/product* name; *Najd Crown* is the *customer hotel* shown in the demo.

## 1. Hard constraints
- **$0 cost.** No paid hosting, no server, no managed database.
- **Static only.** Must build to plain HTML/JS/CSS deployable to GitHub Pages.
- **Self-contained demo data.** A bundled `seed.json`; the app is fully populated on first load with no setup.
- **Deterministic demo.** Same data every visit (seeded generation or a committed JSON file).
- **Bilingual EN/AR** with correct RTL layout when Arabic is active.

## 2. Tech stack (use exactly this)
- **Vite + React + TypeScript**
- **Tailwind CSS** for styling (design tokens in §8)
- **Recharts** for charts (bar, stacked bar, line, donut, radar)
- **react-router-dom** for the role/dashboard routes
- **i18n:** a simple in-repo dictionary (`src/i18n/en.ts`, `src/i18n/ar.ts`) + a `useT()` hook. No paid i18n service.
- **State/persistence:** React state for the demo; optional **IndexedDB** (via `idb`) only if you add interactive data entry. Demo does NOT require persistence.
- **Deploy:** GitHub Actions → GitHub Pages.

## 3. Project structure
```
manar-hr/
├─ public/                    # favicon (NO CNAME here — apex lives in the root <user>.github.io repo)
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx                 # router + role switcher + lang/RTL provider
│  ├─ data/
│  │  ├─ seed.json            # synthetic dataset (generated once, committed)
│  │  └─ generateSeed.ts      # dev script that produced seed.json (kept for transparency)
│  ├─ config/                 # ALL tunable behavior lives here — change without touching code
│  │  ├─ kpiConfig.ts         # KpiDefinition rows: KPIs, weights, methods, params, per dept (§6b)
│  │  └─ gradeBands.ts        # grade thresholds + coaching threshold (§6)
│  ├─ domain/
│  │  ├─ types.ts             # the data model (§5)
│  │  ├─ scoringMethods.ts    # the ~5 generic parameterized formulas — ONLY place math lives (§6a)
│  │  ├─ scoring.ts           # GENERIC engine: reads config, runs methods, computes final+grade (§6)
│  │  └─ scoring.test.ts      # vitest: locks default formulas + proves config changes work
│  ├─ rollups/
│  │  └─ org.ts               # headcount, Saudization, attrition, avg-KPI rollups (§7)
│  ├─ components/             # KpiCard, GradeBadge, ChartFrame, RoleSwitch, LangToggle
│  ├─ dashboards/
│  │  ├─ Executive.tsx
│  │  ├─ HrManager.tsx
│  │  ├─ DepartmentHead.tsx
│  │  └─ EmployeeSelf.tsx
│  ├─ i18n/{en.ts,ar.ts,useT.ts}
│  └─ theme/tokens.ts
├─ .github/workflows/deploy.yml
└─ vite.config.ts             # base path set for Pages
```

## 4. Scope of THIS demo (be decisive — don't over-build)
Build the **MVP money shot** only:
- **Two departments**, each defined entirely in config: **Front Office** (6 KPIs) and **Housekeeping** (4 KPIs — see §6b). Two different templates running through one generic engine proves it's department-agnostic *and* config-driven.
- **Three dashboards live:** Department Head, HR Manager, Executive. **Employee Self-Service** = a fourth, simpler view (build if time permits).
- A **role switcher** in the top bar selects which dashboard renders.
- A **language toggle** (EN/AR) and a **period selector** (6 months of history).
- A visible **"Demo data — synthetic" banner** (no real PII anywhere).

## 5. Data model (`src/domain/types.ts`)
```ts
export type DeptId = "front_office" | "housekeeping";
export type Grade = "Exceptional" | "Excellent" | "Good" | "Fair" | "Needs Improvement";

export interface Department { id: DeptId; name: string; businessUnit: string; region: string; }

export interface JobLevel { id: string; name: string; salaryBandMin: number; salaryBandMax: number; }

export interface Employee {
  employeeId: string;            // canonical PK, e.g. "EMP-00012"
  fullName: string;
  departmentId: DeptId;
  jobLevelId: string;
  gender: "M" | "F";
  nationality: "Saudi" | "Non-Saudi";   // drives Saudization
  age: number;
  educationLevel: string;
  hireDate: string;              // ISO
  tenureYears: number;           // derived
  employmentStatus: "Active" | "Terminated";
  sourceOfHire: string;
  position: string;
}

export type ScoringMethod =
  | "ratioVsTarget"          // min(cap, actual/target*100)            params: { cap }
  | "deduction"              // max(floor, base - Σ(factor*input))     params: { base, floor, penalties:[{field,factor}] }
  | "weightedQuestionnaire"  // Yes/Partial/No items + overall rating  params: { yes, partial, no, overallWeight, cap, bonus? }
  | "sumDivided"             // min(cap, Σ(fields)/divisor)            params: { fields, divisor, cap }
  | "passthrough";           // rawValue is already a 0..maxScore      params: {}

export interface KpiDefinition {        // ONE row per KPI per department — fully DATA-DRIVEN, never hardcoded
  kpiDefId: string;
  departmentId: DeptId;
  name: string;
  weight: number;            // relative weight within the department (engine renormalizes)
  maxScore: number;          // 100, or 110/120 where over-achievement is allowed
  scoringMethod: ScoringMethod;
  params: Record<string, unknown>;   // method-specific config (see §6 catalog)
  active: boolean;           // toggle a KPI off without deleting historical scores
  configVersion: string;     // e.g. "2026-06"; stamp each KpiScore with the config used
}

export interface KpiScore {             // one row per employee / period / KPI
  employeeId: string; period: string;   // "2026-04"
  kpiDefId: string; rawValue: number | null; score: number | null;
}

export interface WorkforceSnapshot {    // strategic facts, per employee / period
  employeeId: string; period: string;
  nitaqatBand: "Red" | "Yellow" | "Green" | "Platinum";  // org-level, copied for convenience
  monthlySalary: number;
  performanceRating: number | null;     // DERIVED = that period's final KPI (the merge!)
  trainingHoursYtd: number;
}

export interface ExitRecord {
  employeeId: string; terminationDate: string; terminationReason: string;
  tenureAtExit: number; period: string;
}

export interface ActionPlan {           // coaching / PIP (from A)
  employeeId: string; period: string; lowestKpi: string; planText: string; createdBy: string;
}
```

## 6. Scoring engine — CONFIG-DRIVEN (KPIs, weights, and formulas must be changeable without code changes)

**This is a hard architectural requirement.** The KPIs, their weights, and even their formulas *will* change over time (HR re-weights, adds/removes a KPI, retunes a penalty). The engine must therefore **read its behavior from configuration data**, not from hardcoded `if`-branches. Concretely:

- **`src/domain/scoringMethods.ts`** — a small library of **generic, parameterized scoring functions** (the catalog below). These are the only places a formula lives. They take `(rawInput, params)` and return a 0..maxScore number. There are ~5 of them and they cover every KPI in the system.
- **`src/config/kpiConfig.ts`** (or `kpiConfig.json`) — the **list of `KpiDefinition` rows** (per §5): each KPI names a `scoringMethod`, supplies its `params`, sets its `weight`, `maxScore`, `active`, and `configVersion`. **Changing a weight, retuning a penalty, swapping a formula, or adding a whole new KPI = editing this config only.** No engine code changes.
- **`src/domain/scoring.ts`** — the **generic engine**: for each employee/period it looks up that department's active KPIs from config, runs each through its named method, then computes `final = Σ(score×weight)/Σ(weight present)` and the grade. The engine knows nothing about "Upselling" or "Attendance" specifically — it only knows methods + config. Adding a KPI never touches this file.
- **`grade bands`** and the **coaching threshold (75)** also live in config (`src/config/gradeBands.ts`), not as literals in code.
- **Versioning:** stamp every computed `KpiScore` with the `configVersion` it was scored under, so historical scores remain reproducible after the config changes.
- **Validation:** on load, assert each department's active weights are > 0; the engine renormalizes by weights-present, so weights need not sum to exactly 1.0.
- **Future-proofing payoff:** because config is just data, a later version can expose an **admin "KPI Builder" screen** (v2 roadmap) that lets HR edit weights/methods through the UI and writes back the same config shape — zero engine rewrite. Build the demo against config files; the screen is a thin editor on top later.

### 6a. Scoring-method catalog (`scoringMethods.ts`) — the only place formulas live
| Method | Formula | params |
|---|---|---|
| `ratioVsTarget` | `round(min(cap, actual/target × 100), 1)` | `{ cap }` |
| `deduction` | `max(floor, round(base − Σ(penalty.factor × input[penalty.field]), 1))` | `{ base, floor, penalties:[{field,factor}] }` |
| `weightedQuestionnaire` | `Σ(answer→points) + (overall/5)×overallWeight (+bonus)`, then `min(cap, …)` | `{ yes, partial, no, overallWeight, cap, bonus? }` |
| `sumDivided` | `round(min(cap, Σ(input[fields])/divisor), 1)` | `{ fields, divisor, cap }` |
| `passthrough` | `rawValue` (already 0..maxScore) | `{}` |

### 6b. Default configuration (`kpiConfig.ts`) — seed these exact values (faithful to the original system)
These reproduce the original Python behavior precisely. They are the **starting config**, not hardcoded logic — anything here can be changed later by editing config. Lock them with unit tests so a future config change can't silently break the math for unchanged KPIs.

**Front Office** (weights sum to 1.0):
`Guest Experience 0.20 · Supervisor 0.15 · Attendance 0.20 · Upselling 0.15 · Enrollments 0.15 · Production 0.15`

Each KPI below lists `[method]` + params — these become its `KpiDefinition` row:

- **Guest Experience** `[weightedQuestionnaire]` `{yes:1.0×20, partial:0.5×20, no:0, overallWeight:20, cap:100}` — five answers Yes=1.0/Partial=0.5/No=0/N-A=null scored ×20; `points = Σ(answer×20) + (overall/5)×20`; `max = 20×(non-null answers) + 20`; `score = round(points/max × 100, 2)`. KPI = average of (mean check-in score, mean check-out score), whichever exist. *(Aggregation of multiple guest forms happens before the engine; the method scores one form.)*
- **Supervisor** `[weightedQuestionnaire]` `{yes:16, partial:8, no:0, overallWeight:20, cap:110, bonus:10}` — `kpi = Σ + (overall/5)×20 + (bonus?10:0)`, then `min(110, kpi)`.
- **Attendance** `[deduction]` `{base:100, floor:0, penalties:[{field:"absentDays",factor:8},{field:"lateMinutes",factor:0.3}]}` → `max(0, round(100 − absentDays×8 − lateMinutes×0.3, 1))`.
- **Upselling** `[ratioVsTarget]` `{cap:100}` → `round(min(100, actual/target×100), 1)`.
- **Enrollments** `[ratioVsTarget]` `{cap:120}` → `round(min(120, actual/target×100), 1)`.
- **Production** `[sumDivided]` `{fields:["checkIns","checkOuts","transactions"], divisor:4.0, cap:100}` → `round(min(100, Σ/4.0), 1)`.

**Final KPI (computed by the generic engine, any department):** `final = Σ(score×weight) / Σ(weight for KPIs that have a score)`, rounded to 1 dp. (Skip missing/inactive KPIs and renormalize — exactly as the original does.)

**Grade bands (config — `gradeBands.ts`):** `≥93 Exceptional · ≥85 Excellent · ≥75 Good · ≥60 Fair · else Needs Improvement`.

**Coaching flag (config — `coachThreshold: 75`):** an employee is "struggling" if `final < threshold` OR any single KPI `< threshold`; the lowest KPI drives the PIP preset.

**Housekeeping template (4 KPIs)** — proves the engine is department-agnostic; same generic final-KPI math, just different config rows:
`Room Quality 0.35 [passthrough] · Productivity 0.30 [ratioVsTarget {cap:100}] · Attendance 0.20 [deduction, same as Front Office] · Supervisor 0.15 [weightedQuestionnaire {cap:100}]`.

> **Test that flexibility actually works.** Beyond locking the default formulas, add one test that **changes a weight in config and asserts the final KPI moves accordingly**, and one that **adds a brand-new KPI to a department via config and asserts the engine picks it up** — with zero changes to `scoring.ts`. If those pass, the system is genuinely future-proof.

## 7. Org rollups (`src/rollups/org.ts`)
- **Headcount** = count(Active employees) [filterable by dept/BU/region].
- **Saudization Rate** = Saudi / total Active. **Nitaqat band** = map rate to Red/Yellow/Green/Platinum (use simple demo thresholds, e.g. <0.25 Red, <0.40 Yellow, <0.60 Green, else Platinum — label as illustrative).
- **Female Representation** = F / total Active.
- **Attrition Rate** = exits in trailing 12 months / avg headcount.
- **Avg Performance** = mean of latest-period `final KPI` across employees — **this is `WorkforceSnapshot.performanceRating` rolled up; it is the literal A↔B merge.**
- **Avg Training Hours** = mean `trainingHoursYtd`.

## 8. Design system (`src/theme/tokens.ts`)
- **Brand:** navy `#0F172A` surfaces · gold `#C9A227` primary accent/CTAs · blue `#2563EB` secondary data series only.
- **Semantic (keep meaningful, don't recolor):** green `#16A34A` (Exceptional/Green band), blue `#2563EB` (Excellent), amber `#D97706` (Good/Yellow), orange `#EA580C` (Fair), red `#DC2626` (Needs Improvement/Red band).
- **Type:** Inter (Latin) + Noto Kufi Arabic (Arabic). Apply `dir="rtl"` + right-align when language = AR.
- **Components:** one KPI card spec, one grade badge, one chart frame (transparent bg, gold primary series). Dark theme by default.

## 9. Dashboards (what each must render)
- **Department Head:** dept + period filter → per-employee **stacked weighted-KPI bar**, **grade donut**, ranked team table with grades, and a **coaching queue** (<75%) with a PIP builder using preset plans per lowest KPI.
- **HR Manager:** all-department view → avg KPI by department (grouped bar), grade mix, coaching load, a turnover/exit-reason chart, training completion.
- **Executive:** card row (Headcount · Saudization+Nitaqat · Female Rep · Attrition · **Avg Performance** · Avg Training) + Nitaqat gauge + hires-vs-exits trend + org-KPI trend. Filters: business unit, region, period.
- **Employee Self-Service (optional):** pick an employee → their KPI trend line, radar of sub-scores vs. team avg, their action plan.

## 10. Build & deploy steps
1. `npm create vite@latest hotelpulse -- --template react-ts` → install Tailwind, recharts, react-router-dom, idb, vitest.
2. Implement §5–§9. Write `scoringMethods.ts` + `kpiConfig.ts` + `scoring.test.ts` first and make them pass (TDD the config-driven engine).
3. Generate `seed.json` once via `generateSeed.ts` (spec in §11), commit it.
4. Name the repo **`hr`**. Set `base: "/hr/"` in `vite.config.ts`, give React Router `basename="/hr"`, and after build copy `dist/index.html` → `dist/404.html` (SPA fallback so `binnasban.com/hr/executive` works on refresh). Do **not** add a `CNAME` in this repo.
5. Add `.github/workflows/deploy.yml` (Vite build → copy 404.html → upload-pages-artifact → deploy-pages).
6. One-time apex setup (separate repo): create a `<username>.github.io` repo, set its Pages custom domain to `binnasban.com` (this writes the apex `CNAME` and is where you add DNS: apex `A`/`ALIAS` records → GitHub Pages IPs). Then in the **`hr`** repo: Settings → Pages → Source = GitHub Actions. The app appears at **`binnasban.com/hr/`**.
7. Verify the live URL loads, both languages work, all three dashboards render with data.

## 11. Seed data spec (`generateSeed.ts`)
- All employees belong to **Najd Crown Hotel & Residences** (single property; `businessUnit` can read "Najd Crown — Riyadh").
- **~55 employees:** ~32 Front Office, ~23 Housekeeping. Mix of `JobLevel`, ~30% female, ~55% Saudi (so Saudization lands in a "Yellow/Green" band that looks realistic). Hire dates spread across 1–8 years.
- **6 monthly periods** (e.g. 2025-11 … 2026-04) of `KpiScore` rows for every active employee, with realistic noise so rankings, grades, and trends vary. ~5–6 employees should fall below 75 to populate the coaching queue.
- **~6 `ExitRecord`s** across the window (varied reasons: resignation, end of contract, performance) so attrition and exit-reason charts have content.
- **`WorkforceSnapshot`** per employee/period with salary by job level, training hours, and `performanceRating` = that period's computed final KPI.
- Add an `isDemo: true` marker; render the synthetic-data banner.

## 12. Acceptance criteria (definition of done)
- [ ] Static build deploys to GitHub Pages and loads on the custom domain.
- [ ] `scoring.test.ts` passes: reproduces the §6 default formulas exactly (known fixture) AND proves flexibility — a config weight change moves the final KPI, and a new KPI added via config is picked up with zero changes to `scoring.ts`.
- [ ] All KPIs, weights, formulas, grade bands, and the coaching threshold live in `src/config/` — none hardcoded in the engine.
- [ ] Role switch renders all three dashboards; each is populated from `seed.json`.
- [ ] Switching to Arabic flips layout to RTL and translates labels.
- [ ] The "money shot" works: in Department Head you see a person's weighted KPIs + coaching flag; switch to Executive and that person is included in Avg Performance / Saudization rollups.
- [ ] No real PII anywhere; synthetic-data banner visible.
- [ ] README explains the project, the A↔B merge, and how to run/deploy.

## 13. Suggested build order
types → scoringMethods → kpiConfig + gradeBands → generic engine + tests (incl. flexibility tests) → seed generation → theme/tokens + components → Department Head → rollups → Executive → HR Manager → i18n/RTL → deploy → (Employee Self-Service if time).

*End of paste-into-Claude-Code brief.*

---

# PART B — SIMPLE REAL-WORLD IMPLEMENTATION (in a hotel / company)

The demo proves the idea with synthetic data. Putting it to work in a real property should be **deliberately low-friction** — win on one department before asking anyone to integrate anything.

**Phase 0 — Pilot one department, manual data (weeks 1–4).** Pick the department whose head wants it (usually Front Office). No system integration. Each month, the supervisor exports what already exists — attendance from the time system, upselling/enrollment tallies, production counts from Opera PMS/POS, and fills a simple guest-feedback and supervisor-evaluation sheet. These map to the Excel shapes the original system already understands. You (or HR) load them; the app computes KPIs, rankings, and the coaching queue. **Val