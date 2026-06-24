# HotelPulse — Hotel HR Platform Demo

A unified hotel HR platform demo for **Najd Crown Hotel & Residences** (فندق وأجنحة تاج نجد), Riyadh. Built as a static React SPA with synthetic demo data, deployable to GitHub Pages at `binnasban.com/hr`.

**Product:** HotelPulse · **Demo hotel:** Najd Crown Hotel & Residences · **All data is synthetic.**

---

## The A↔B Merge

This app unifies two ideas on one employee record:

- **A — Operational KPI**: a weighted 0–100 monthly performance score per employee, computed from 4–6 department-specific KPIs (Guest Experience, Attendance, Upselling, etc.)
- **B — Strategic workforce analytics**: Saudization rate, Nitaqat band, female representation, attrition, training hours

The merge: `WorkforceSnapshot.performanceRating` = the final KPI computed from A, stored alongside B's strategic fields. The Executive dashboard's "Avg Performance" card is literally the mean of those merged records — proving A and B are two lenses on the same employee, not two separate systems.

---

## Running locally

```bash
npm install
npm run dev          # dev server at localhost:5173/hr/
npm test             # vitest: 17 tests, scoring engine + flexibility proofs
npm run build        # static output in dist/
```

### Regenerate seed data

```bash
npx tsx src/data/generateSeed.ts
```

Produces `src/data/seed.json` — deterministic (seeded PRNG), committed, no PII.

---

## Architecture: Config-driven scoring engine

**The single most important requirement**: KPIs, weights, and formulas must be changeable without touching engine code.

```
src/config/kpiConfig.ts      ← KPI rows: name, weight, method, params, active
src/config/gradeBands.ts     ← grade thresholds + coaching threshold (75)
src/domain/scoringMethods.ts ← ~5 generic formulas (the ONLY place math lives)
src/domain/scoring.ts        ← generic engine: reads config, runs methods
```

### How it works

1. `kpiConfig.ts` defines each KPI: `{ scoringMethod: "ratioVsTarget", params: { cap: 100 } }`
2. `scoring.ts` dispatches to the right method from `scoringMethods.ts`
3. Final KPI = `Σ(score × weight) / Σ(weight present)` — renormalizes for missing KPIs
4. Grade = config lookup in `gradeBands.ts`

**To change a KPI weight**: edit `kpiConfig.ts`. `scoring.ts` never changes.  
**To add a new KPI**: add a row to `kpiConfig.ts`. `scoring.ts` never changes.  
**To retune a penalty**: edit `params` in `kpiConfig.ts`. `scoring.ts` never changes.

This is proven by `scoring.test.ts`:
- 17 tests lock the default formulas against known fixtures from the original Python
- Flexibility tests: changing a weight moves the final KPI; adding a new KPI via config is picked up automatically

---

## KPI catalog (Front Office)

| KPI | Weight | Method | Formula |
|-----|--------|--------|---------|
| Guest Experience | 20% | `weightedQuestionnaire` | Yes/Partial/No × 20 + overall × 20, normalized to 100 |
| Supervisor | 15% | `weightedQuestionnaire` | Yes=16/Partial=8, overall × 20, bonus +10, cap 110 |
| Attendance | 20% | `deduction` | `max(0, 100 − absentDays×8 − lateMinutes×0.3)` |
| Upselling | 15% | `ratioVsTarget` | `min(100, actual/target × 100)` |
| Enrollments | 15% | `ratioVsTarget` | `min(120, actual/target × 100)` |
| Production | 15% | `sumDivided` | `min(100, (checkIns+checkOuts+transactions)/4.0)` |

**Housekeeping** (4 KPIs): Room Quality (passthrough) · Productivity (ratioVsTarget) · Attendance (deduction) · Supervisor (weightedQuestionnaire) — same generic engine, different config.

---

## Dashboards

| Role | What it shows |
|------|--------------|
| **Executive** | Headcount · Saudization + Nitaqat gauge · Female rep · Attrition · Avg KPI · Avg training · KPI trend by dept · Hires vs exits |
| **HR Manager** | Avg KPI by dept · Grade distribution · Coaching queue · Exit reasons · Training hours |
| **Department Head** | Stacked weighted-KPI bar per employee · Grade donut · Ranked team table · Coaching queue with PIP presets |
| **Employee Self-Service** | My KPI trend · Radar vs team avg · KPI breakdown · Action plan |

---

## Deploy to GitHub Pages

1. Push to the `hr` repo on GitHub.
2. Settings → Pages → Source: **GitHub Actions**.
3. The workflow (`.github/workflows/deploy.yml`) runs tests, builds, copies `dist/index.html → dist/404.html` (SPA fallback), and deploys.
4. **No `CNAME` in this repo** — the apex domain `binnasban.com` is managed in the separate `<username>.github.io` root repo. This repo appears at `binnasban.com/hr/` automatically.

---

## Seed data

- **55 employees**: ~32 Front Office, ~23 Housekeeping
- **~59% Saudi**, ~24% female (Yellow/Green Nitaqat band)
- **6 monthly periods**: 2025-11 → 2026-04
- **~6 strugglers** seeded below coaching threshold (< 75)
- **6 exit records**: varied reasons (resignation, end of contract, performance)
- Deterministic (seeded PRNG `mulberry32(0xdeadbeef)`) — same data every run
