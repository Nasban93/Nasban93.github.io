# Unified Hotel HR Platform — Design Plan

**Platform name:** **HotelPulse** — a full employee-lifecycle Hotel HR platform that merges *HotelPulse v5.1* (operational performance engine) and the *Workforce Analytics Suite* (strategic workforce/compliance analytics) into one coherent product on one employee master record.

**Document type:** Architecture & design plan (planning artifact, not application code). Intended to be handed to an implementation session.

**Author framing:** People Analytics / HR Systems architecture portfolio case study.

**Hard constraints (drive every decision below):**
- **Budget: $0.** No paid hosting, no paid database, no paid services — ever.
- **Goal: land an HR role** by proving I can *transform an HR function and add measurable value*, not by proving I can code.
- **Assets available:** the `binnasban.com` domain · a free GitHub account · Claude (Sonnet) as the build partner.

These constraints are not limitations to apologize for — they are the story. "I built and deployed a full HR platform for $0 and used it to show how I'd transform your people function" is a stronger hiring signal than any enterprise stack.

---

## Design thesis (read first)

The two artifacts are not two apps to bolt together — they are the two *altitudes* of the same HR function looking at the same people:

- **HotelPulse (A)** is the **operational altitude**: per-employee, per-month, "how is *this* person performing this month, and what do we coach?" Its crown jewel is a **weighted 0–100 KPI engine** with a coaching/PIP workflow.
- **The Workforce Analytics Suite (B)** is the **strategic altitude**: org-level, point-in-time-and-trend, "what is the *shape and health* of our workforce, and are we compliant?" Its crown jewel is **Saudization/Nitaqat + demographic + turnover analytics**.

The merge principle is therefore: **one `EmployeeID` ties an operational record (A) to a master/demographic record (B), and performance scores roll *up* from A into B's strategic rollups while compliance/demographic context flows *down* into A's operational views.** Neither engine is discarded; each becomes a layer of one stack.

```
            ┌─────────────────────────────────────────────┐
   STRATEGIC│  Executive HR Analytics  (org rollups)        │  ← B's domain, extended
            │  Workforce Planning · Saudization/Nitaqat     │
            │  Turnover Analytics · Comp · Engagement       │
            └───────────────▲───────────────────────────────┘
                            │  rolls up (avg KPI, attrition, headcount)
            ┌───────────────┴───────────────────────────────┐
 OPERATIONAL│  Performance Mgmt · Attendance · L&D · Coaching│  ← A's domain, generalized
            │  weighted 0–100 KPI per employee / month       │
            └───────────────▲───────────────────────────────┘
                            │  keyed on
            ┌───────────────┴───────────────────────────────┐
   FOUNDATION│  ONE Employee Master  (EmployeeID, dept, etc.) │  ← shared spine
            └────────────────────────────────────────────────┘
```

---

## 1. Unified Scope & Integration Map

The platform covers twelve lifecycle domains plus an executive layer. Each maps to a source artifact and a build disposition.

| # | HR Domain | Source | Reusable as-is | Needs generalizing | Net-new to build |
|---|-----------|--------|----------------|--------------------|------------------|
| 1 | **Recruitment & Onboarding** | B (partial) | `SourceOfHire`, `HireDate` fields; hiring-channel retention analysis | B only *analyzes* hires retrospectively — generalize into a forward **requisition → candidate → offer → hire pipeline** | Pipeline stages, candidate entity, onboarding checklist/probation tracking |
| 2 | **Workforce Planning & Saudization/Nitaqat Compliance** | **B (core)** | **Nitaqat banding, Saudization rate, headcount, female-representation logic — preserve intact** | Tie band thresholds to live headcount instead of a static export | Headcount-target planning; "what-if" Saudization simulator (v3) |
| 3 | **Performance Management** | **A (core)** | **Weighted 0–100 KPI engine, grade bands, ranking — preserve as operational core** | **Generalize the 6 Front-Office KPIs into a configurable, department-specific KPI template system** (Housekeeping, F&B, Engineering, Sales, etc.) | KPI template designer; annual/quarterly review cycles layered over monthly scores |
| 4 | **Attendance & Time** | A (core) | Lateness/absence/AWH → 100-pt formula; monthly attendance score | Same formula serves all departments; keep raw-roster → monthly rollup ingestion | Leave/vacation balance tracking (links to Comp) |
| 5 | **Compensation & Benefits** | **Neither** | — | — | **Full net-new domain.** Salary bands by JobLevel, pay-vs-performance matrix, merit-increase cycle, benefits enrollment. Reads `MonthlySalary` (from B's master) + `PerformanceRating` (from A's engine) |
| 6 | **Learning & Development** | B (light) + A (coaching) | B's `TrainingHoursYTD`; A's PIP preset library | Promote A's coaching PIPs and B's training hours into one **L&D module**: catalog, enrollment, completion, hours-by-level | Training catalog, course→competency mapping, ROI (training hours vs. KPI delta) |
| 7 | **Employee Relations / Disciplinary** | **Neither** | — | A's `action_plans` table is the structural seed | **Net-new:** case log (verbal/written warning → PIP → termination), linked to performance dips and attendance |
| 8 | **Succession Planning** | **Neither** | — | Reuse A's KPI + B's `JobLevel`/`TenureYears` as inputs | **Net-new:** 9-box grid (performance × potential), key-role flagging, bench strength |
| 9 | **Offboarding & Turnover Analytics** | **B (core)** | **Exit reasons, tenure-at-exit, hires-vs-exits trend, attrition rate — preserve** | Connect retrospective exits to live `EmploymentStatus`/`TerminationDate` transitions | Offboarding checklist; predictive attrition risk score (v3) |
| 10 | **Employee Engagement / eNPS** | **Neither** | — | — | **Net-new:** pulse-survey instrument, eNPS calc, engagement-vs-attrition correlation |
| 11 | **Compensation & Benefits → see #5** | — | — | — | — |
| 12 | **Executive HR Analytics (rollup)** | **B (core)** + A | **B's KPI cards (Headcount, Saudization, Female Rep, Attrition, Avg Perf, Avg Training) — preserve as the exec card row** | Add A's avg operational KPI + coaching-load as new exec cards | Cross-domain "HR health index"; alert/exception feed |

### The keying contract (how A and B actually join)

This is the linchpin and must be made explicit for the implementation session.

**Shared primary key.** Both systems already speak `EmployeeID`. In A this is `agents.emp_id` (TEXT, e.g. `S001`); in B it is `EmployeeID` across the flat 1,250-row table. **Decision: a single `employees.employee_id` becomes the canonical PK.** A's `agents` table collapses *into* this master; B's flat table is the source that *populates* its demographic columns. A migration step normalizes A's sample IDs (`S001`) and B's IDs to one scheme (recommend `EMP-{nnnnn}`).

**Shared department taxonomy.** This is the single biggest integration hazard. A currently has no real `department` — it implicitly *is* "Front Office," with a `position` free-text field (`Agent`, `Senior Agent`, `Night Agent`, `Supervisor`). B has `BusinessUnit`, `Department`, `Region`. **Decision: adopt B's `Department` as the controlled vocabulary and add `Front Office` as one value; A's per-employee scores gain a `department_id` FK via their employee record.** A's six KPIs become the *Front Office KPI template*; each other department gets its own template (Section 3 of data model).

**The join, concretely:**

```
employees (employee_id, department_id, ...)              ← spine (from B's master)
   │  1───────────────────────────────────────────┐
   │                                               │
kpi_scores (employee_id, period_id, kpi_def_id,    workforce_snapshot (employee_id,
            raw, score, weight)   ← from A          period_id, nitaqat_band,
   │                                                 saudization_flag, salary, ...)
   └── roll up: AVG(final_kpi) per department ──────►  feeds Exec "Avg Performance" card
```

So **`PerformanceRating` in B's master is no longer a static imported number — it becomes a derived rollup of A's monthly `kpi_scores`.** That single change is what turns "two systems" into "one platform," and it is the headline of the case study.

---

## 2. Data Architecture

A normalized relational model. Below: the entity list, the ER relationships, and exactly where A's SQLite schema and B's flat table plug in.

### 2.1 Core entities (normalized)

**Foundation / org**
- `departments` (department_id PK, business_unit, name, region) — *from B's `BusinessUnit`/`Department`/`Region`; net structure*
- `job_levels` (job_level_id PK, name, salary_band_min, salary_band_max) — *from B's `JobLevel`, extended for Comp*
- `employees` (employee_id PK, full_name, department_id FK, job_level_id FK, gender, nationality, age/dob, education_level, hire_date, tenure_years [derived], employment_status, source_of_hire, position) — **the merged master. B's flat table maps almost 1:1 here; A's `agents` table collapses into it.**

**Performance (A's engine, generalized)**
- `evaluation_periods` (period_id PK, year, month, label, status) — *replaces A's free-text `month` strings ("April 2026", "SAMPLE") with a real dimension*
- `kpi_definitions` (kpi_def_id PK, department_id FK, name, weight, max_score, scoring_method) — **net-new generalization layer**; A's hardcoded `WEIGHTS` dict becomes rows here, one set per department
- `kpi_scores` (id PK, employee_id FK, period_id FK, kpi_def_id FK, raw_value, score, created_at) — **the generalized successor to A's six per-source tables** (`guest_feedback`, `supervisor_eval`, `attendance`, `upselling`, `enrollments`, `production`)
- `kpi_source_records` (id PK, employee_id FK, period_id FK, kpi_def_id FK, payload JSON) — *optional detail store preserving A's rich per-source fields (guest names, q1–q5, late_minutes) without polluting the score table*

**Strategic (B's analytics)**
- `workforce_snapshots` (snapshot_id PK, employee_id FK, period_id FK, nitaqat_band, saudization_flag, monthly_salary, performance_rating [derived], training_hours_ytd) — **point-in-time facts enabling B's trend charts;** preserves Nitaqat/Saudization/demographic analytics intact
- `exit_records` (exit_id PK, employee_id FK, termination_date, termination_reason, tenure_at_exit, period_id FK) — *from B's `TerminationDate`/`TerminationReason`*

**Lifecycle (net-new + seeds)**
- `requisitions` / `candidates` / `applications` — recruitment pipeline (net-new)
- `training_courses` / `training_enrollments` — L&D (B's `TrainingHoursYTD` becomes a rollup of enrollments)
- `action_plans` (employee_id FK, period_id FK, lowest_kpi, plan_text, created_by) — **A's existing table, kept nearly as-is**, now the bridge into:
- `er_cases` — disciplinary/employee-relations case log (net-new; extends action_plans)
- `succession_assessments` (employee_id FK, period_id FK, performance_box, potential_box) — 9-box (net-new)
- `engagement_responses` (employee_id FK, survey_id FK, enps_score, ...) — eNPS (net-new)
- `compensation_actions` (employee_id FK, effective_date, old_salary, new_salary, merit_pct, reason) — Comp & Ben (net-new)

### 2.2 ER relationships (text schema)

```
departments 1──* employees *──1 job_levels
employees   1──* kpi_scores *──1 kpi_definitions *──1 departments
employees   1──* kpi_scores *──1 evaluation_periods
employees   1──* workforce_snapshots *──1 evaluation_periods
employees   1──0..1 exit_records
employees   1──* action_plans ──* er_cases
employees   1──* training_enrollments *──1 training_courses
employees   1──* succession_assessments
employees   1──* engagement_responses
employees   1──* compensation_actions
candidates  1──0..1 employees   (a hired candidate becomes an employee)
```

Everything fans out from **`employees`**, which is the literal embodiment of the merge.

### 2.3 Where each existing artifact plugs in

**A's SQLite schema → maps as follows:**

| A's current table | Becomes |
|---|---|
| `agents` | folded into `employees` (gains `department_id`, demographic cols) |
| `guest_feedback`, `supervisor_eval`, `attendance`, `upselling`, `enrollments`, `production` | unified into `kpi_scores` (one row per employee/period/KPI) + `kpi_source_records` (raw detail). Each old table = one Front-Office `kpi_definition`. |
| free-text `month` ("April 2026", "SAMPLE") | normalized into `evaluation_periods` |
| hardcoded `WEIGHTS` dict + `grade()` bands | become data: rows in `kpi_definitions` + a `grade_bands` config table |
| `action_plans` | kept, re-keyed to `period_id`, extended by `er_cases` |
| `is_sample` flag pattern | **preserve** — excellent for the portfolio demo mode; promote to a top-level `is_demo` on relevant tables |

**B's flat employee table (20 fields) → maps as follows:**

| B's columns | Land in |
|---|---|
| EmployeeID | `employees.employee_id` (canonical PK) |
| BusinessUnit, Department, Region | `departments` |
| Gender, Nationality, Age, EducationLevel, HireDate, TenureYears, EmploymentStatus, SourceOfHire | `employees` |
| JobLevel | `job_levels` + `employees.job_level_id` |
| MonthlySalary, NitaqatBand | `workforce_snapshots` (so they can be tracked over time, not just "now") |
| PerformanceRating | **`workforce_snapshots.performance_rating`, now DERIVED from `kpi_scores` rollup** |
| TrainingHoursYTD | rollup of `training_enrollments` (stored snapshot) |
| TerminationDate, TerminationReason | `exit_records` |

The decisive architectural move: **B's flat table flips from "system of record" to "monthly snapshot," because the system of record for performance and training is now A's transactional engine.** B's spreadsheet was a denormalized photograph; the merged model makes the photograph a *view*.

---

## 3. Dashboard Inventory

Four audience tiers. Each dashboard lists purpose, primary KPIs, chart types, and filters. The same `kpi_scores` and `workforce_snapshots` tables feed all four — only the aggregation level changes, which is the whole point.

### 3.1 Executive / GM dashboard — "Org Health & Compliance"
- **Purpose:** one screen the GM checks monthly; org-wide health + regulatory standing.
- **Primary KPIs (card row, from B + A):** Headcount · **Saudization Rate + Nitaqat Band** · Female Representation · Attrition Rate (rolling 12m) · **Avg Operational KPI (from A)** · Avg Training Hours · eNPS.
- **Charts:** Nitaqat band gauge (red/yellow/green vs. threshold); hires-vs-exits trend (dual line); headcount by business unit (bar); attrition by department (heatmap); org KPI trend (line).
- **Filters:** Business Unit, Region, Period.

### 3.2 HR Manager dashboard — "Cross-Department Operations"
- **Purpose:** the daily driver; spot problem departments, manage funnel and turnover.
- **Primary KPIs:** Avg KPI by department · Recruitment funnel conversion · Time-to-hire · Turnover by reason · Coaching/PIP load · Training completion %.
- **Charts:** department KPI comparison (grouped/stacked bar — *generalizes A's stacked weighted-KPI chart across departments*); recruitment funnel; exit-reason Pareto; hiring-channel retention (from B); open-case list.
- **Filters:** Department, Period, Job Level, Employment Status.

### 3.3 Department Head dashboard — "My Team" (A's view, generalized)
- **Purpose:** A's current HotelPulse experience, now scoped to *any* department's KPI template.
- **Primary KPIs:** Team average · Top performer · Grade distribution · **Coaching queue (<75%)**.
- **Charts:** per-employee weighted stacked KPI bar (**A's existing chart, preserved**); grade donut (**A's existing pie, preserved**); ranked team table with grades; coaching-queue list → PIP builder (**A's coaching tab, preserved**).
- **Filters:** Period, KPI source, employee.

### 3.4 Employee Self-Service dashboard — "My Performance & Growth"
- **Purpose:** transparency; net-new but cheap given the data exists.
- **Primary KPIs:** My monthly KPI + trend · My grade · My rank band (anonymized) · My training hours · My active development plan.
- **Charts:** personal KPI trend line; radar of my six (or N) sub-scores vs. team average; my PIP/action-plan status; my training progress.
- **Filters:** Period.

### 3.5 Design system reconciliation (decisive)

The two artifacts have clashing identities: A uses **blue (#2563EB) / Inter / light-mode Streamlit**; B uses **dark navy + gold "executive ledger."** Do not run two themes.

**Decision: adopt B's navy + gold as the platform's primary brand identity, and demote A's blue to a single functional accent.** Rationale: navy/gold reads as "enterprise HR product" and photographs better in a portfolio; blue/Inter reads as "internal tool." Concretely:

- **Palette:** Navy `#0F172A` (surfaces) · Gold `#C9A227` (primary accent, KPIs, CTAs) · keep A's blue `#2563EB` only as a secondary data-series color · semantic green/amber/red retained for grade bands and Nitaqat (these carry meaning, don't recolor them).
- **Typography:** keep A's **Inter** (it pairs well with navy and already supports the UI); **retain `Noto Kufi Arabic` and A's full bilingual EN/AR + RTL handling** — this is a differentiator, not a thing to drop.
- **Components:** one shared card spec (A's `.kc` KPI card restyled to navy/gold), one chart theme (transparent backgrounds, gold primary series), one grade-badge component.
- **Deliverable:** a one-page design-token sheet (colors, type scale, spacing, the bilingual rule) so all four dashboards look like one product.

---

## 4. Tech Stack Decision

**Decision: drop Streamlit. Build the unified platform as a static React single-page app and deploy it to GitHub Pages on `binnasban.com`. Ship synthetic demo data as bundled JSON; port A's scoring engine to TypeScript; use the browser (IndexedDB) for any interactive data entry. $0, on my own domain, zero-ops.**

This is a direct consequence of the hard constraints. Reasoning, decisively:

- **Why not Streamlit (despite A already being built in it).** Streamlit Community Cloud's free tier **cannot serve the app from a custom apex domain** — only a `*.streamlit.app` subdomain. It also sleeps when idle and has an ephemeral filesystem, so SQLite data resets on every reboot. For a portfolio whose entire job is "a recruiter clicks my link weeks later and is immediately impressed," all three are disqualifying. Streamlit is the right tool for an *internal Python data app*; it is the wrong tool for a *public, branded, always-on portfolio product*.
- **Why a static React SPA on GitHub Pages.** GitHub Pages is free, serves the app **from `binnasban.com` (custom apex domain supported)**, never sleeps, loads instantly, and requires zero server maintenance. It absorbs artifact B (already HTML/Chart.js) into one codebase and one design system, and it makes the platform feel like a real product rather than an internal tool.
- **Data model becomes client-side.** The normalized model in Section 2 ships as **TypeScript interfaces + a bundled `seed.json`** of synthetic data (curated once; A's `is_sample` demo pattern is the template). The demo is therefore always populated and deterministic. For interactivity (entering a score, building a PIP), persist to **IndexedDB** — per-visitor, free, no backend.
- **Scoring engine ports cleanly.** A's weighted 0–100 KPI logic (`WEIGHTS`, `calc_kpis`, `grade()`) is ~30 lines; it becomes a pure TypeScript module — easy to unit-test, which strengthens the engineering-rigor story.
- **Recommended toolchain:** **Vite + React + TypeScript**, **Tailwind** (design tokens), **Recharts or Chart.js** (charts), **i18n via a simple JSON dictionary** (preserves A's bilingual EN/AR + RTL — a real differentiator). Build artifacts deploy to Pages via a free **GitHub Actions** workflow on push.
- **Role-based views** become a top-bar role switch (Exec / HR Manager / Dept Head / Employee) selecting which dashboard renders — trivial client-side, and it sells the "enterprise platform" narrative.

**Alternative considered and rejected — Next.js on Vercel + Neon Postgres (also $0, also allows custom domain).** It buys real server-side persistence and auth, which would impress an *engineer*. But the audience is HR hiring managers; it adds moving parts that can sleep or hit free-tier limits, and it makes the *transformation* story no stronger. Reserve it as a documented "how I'd productionize this" appendix, not the build.

**Also rejected:** keeping three live front-ends, any paid host, any server you have to babysit.

Stack summary: **Vite + React + TypeScript · Tailwind · Recharts/Chart.js · IndexedDB · bundled JSON seed · GitHub Actions → GitHub Pages on `binnasban.com`. Total cost: $0.**

---

## 5. Phased Roadmap

Three phases, each ending in a demoable milestone. The merge happens in MVP; net-new domains are layered in v2–v3 so each release tells a clean story.

### MVP — "One master, two altitudes" (the merge itself)
*Goal: prove A and B are one system on one employee record.*
- Build `employees` master + `departments` + `evaluation_periods` + `job_levels`.
- Migrate A's six KPI tables → generalized `kpi_definitions` + `kpi_scores`; **preserve the weighted 0–100 engine and grade bands exactly.**
- Generalize Performance Mgmt beyond Front Office: ship **Front Office + one more department** (recommend Housekeeping) with its own KPI template, proving the template system works.
- Ingest B's master → populate demographics + `workforce_snapshots`; **wire `PerformanceRating` to roll up from `kpi_scores`.**
- Ship 3 of 4 dashboards: **Department Head (A, generalized)**, **HR Manager**, **Executive (with B's Saudization/Nitaqat cards live).**
- Stand up the React/Vite project; port A's scoring engine to TypeScript with unit tests; load the synthetic `seed.json`. Deploy to GitHub Pages on `binnasban.com` from day one (deploy early, deploy often).
- **Demoable milestone:** a live link at `binnasban.com/hr` where you "Pick a department → see live weighted KPIs and coaching queue. Switch to Exec → see those same people rolled into org-wide Saudization, attrition, and avg-performance cards." *This single demo, on your own domain, is the portfolio money shot.*

### v2 — "Full lifecycle inflow/outflow + the people domains"
*Goal: extend from scoring to managing the lifecycle.*
- **Recruitment & Onboarding:** requisition→candidate→hire pipeline + onboarding/probation; connect to B's hiring-channel-retention analytics.
- **Offboarding & Turnover Analytics:** activate `exit_records` + B's full turnover suite (exit reasons, tenure-at-exit, hires-vs-exits trend) on live status transitions.
- **L&D:** training catalog + enrollments; `TrainingHoursYTD` becomes derived; add training-hours-vs-KPI-delta ROI chart.
- **Employee Relations/Disciplinary:** extend `action_plans` into `er_cases` (warning→PIP→termination), linked to performance/attendance dips.
- **Employee Self-Service** dashboard ships.
- Roll out remaining departments (F&B, Engineering, Sales).
- **Demoable milestone:** a full employee journey on one screen — hire → score → coach → discipline or develop → (if needed) exit, with each step feeding turnover analytics.

### v3 — "Strategic & predictive layer"
*Goal: the executive/strategic capabilities that signal senior architecture.*
- **Compensation & Benefits:** salary bands, **pay-vs-performance matrix** (Comp × A's KPI), merit-cycle, benefits.
- **Succession Planning:** 9-box (KPI × potential), key-role flagging, bench strength.
- **Engagement/eNPS:** pulse surveys + engagement-vs-attrition correlation.
- **Executive HR Analytics rollup:** cross-domain "HR Health Index," exception/alert feed, **Saudization what-if simulator**, predictive attrition-risk score.
- **Demoable milestone:** an executive opens one page, sees the HR Health Index, drills from a red Nitaqat band into the exact hiring plan that fixes it, and sees an at-risk-attrition watchlist with the comp/engagement drivers behind it.

**Where A and B literally merge vs. where net-new lands:** A↔B merge is **done in MVP** (shared master + rollup). Net-new domains arrive deliberately later: Recruitment/Offboarding/L&D/ER in **v2**; Comp/Succession/Engagement/predictive in **v3**.

---

## 6. Portfolio Packaging

### Project name & framing
**"HotelPulse — A Unified Hotel Employee-Lifecycle Platform."** Tagline: *"From a single agent's monthly score to the whole property's Saudization compliance — one employee record, one platform."* (Builds directly on your existing HotelPulse brand, evolving it from a single-department performance tool into a full-lifecycle HR platform.)

Position it explicitly as a **systems-integration and HR-architecture case study**, not "an app I built." The skill being demonstrated is *merging two real systems into one coherent platform on a shared data model* — which is exactly what enterprise HR/People-Analytics roles do.

### Artifacts to produce
1. **Written case study (the hero deliverable, ~6–10 pages):** problem → the two starting systems → the integration insight (shared master + rollup) → architecture decisions → phased delivery → outcomes. This *is* the portfolio piece; the app supports it.
2. **Architecture diagram:** the 3-layer stack (foundation → operational → strategic) with data flow arrows.
3. **ER diagram:** the normalized model from Section 2 (visual; clearly showing A's tables and B's columns plugging in).
4. **Integration map visual:** the Section-1 table as a clean graphic showing reuse vs. generalize vs. net-new.
5. **Dashboard mockups:** the four audience views in the reconciled navy/gold design system (even static high-fidelity mockups suffice).
6. **Live demo:** the React app in MVP demo-mode (synthetic data), served from `binnasban.com/hr` — one link that always works, instantly, on your own domain.
7. **Before/after schema snippet:** A's six-tables + B's flat table → the unified model, shown side by side (one page; the most persuasive single image for a technical reviewer).

### Deployment plan ($0, on your domain)
- **`binnasban.com/hr` → GitHub Pages (path-based).** Point the apex `binnasban.com` at GitHub Pages once via a `<username>.github.io` root repo (custom-domain `CNAME` + DNS records). A project repo named `hr` then serves automatically at `binnasban.com/hr/` — set the app's `base`/router to `/hr`. No subdomain DNS needed.
- **Repo + CI:** one public GitHub repo; a free GitHub Actions workflow builds the Vite app and publishes to Pages on every push. The public repo *itself* is a portfolio artifact — clean commits and a strong README tell their own story.
- **Suggested URL layout:** `binnasban.com` = portfolio/case-study landing (the `<username>.github.io` repo) → `binnasban.com/hr` = the live platform (the `hr` project repo) → repo linked from both.
- **No databases, no servers, no bills.** If you later want live multi-user entry, the documented upgrade path is Neon's free Postgres (it scales to zero rather than pausing) behind a serverless function — but it is explicitly out of scope for the hiring demo.

### Narrative arc (for a hotel HR hiring manager)
Frame it as a story of **judgment**, not features:

1. *"I had two working systems built for different audiences — a front-desk performance engine and an executive workforce-analytics suite."*
2. *"The trap was bolting them together. The insight was that they were looking at the same people from two altitudes."*
3. *"So I unified them on one employee record, and made the executive's 'Average Performance' number stop being a static spreadsheet cell and start being a live rollup of every agent's monthly KPI."*
4. *"Then I generalized the front-office scoring engine to every department and extended the model across the full employee lifecycle — recruitment to offboarding to succession — while preserving the Saudization/Nitaqat compliance analytics the GM actually answers to."*
5. *"And I shipped it for $0 — a static React app on my own domain, role-based dashboards, bilingual EN/AR — proving I deliver value under real constraints rather than asking for a budget first."*

The closing line for the hiring manager: **"This is how I'd architect your HR platform — start from the employee, make every altitude read the same truth, and stay compliant by design."**

---

### Constraints honored
- Planning document only; schema/pseudocode kept illustrative.
- A's weighted 0–100 KPI engine preserved as the operational core; B's Saudization/demographic analytics preserved as the strategic layer — integrated, not