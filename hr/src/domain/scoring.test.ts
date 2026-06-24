import { describe, it, expect } from "vitest";
import { computeScores, type RawKpiInput } from "./scoring";
import { KPI_DEFINITIONS } from "../config/kpiConfig";
import type { KpiDefinition } from "./types";

// ─── helpers ────────────────────────────────────────────────────────────────

const foKpis = () => KPI_DEFINITIONS.filter((d) => d.departmentId === "front_office");
const hkKpis = () => KPI_DEFINITIONS.filter((d) => d.departmentId === "housekeeping");

// ─── 1. Default formula fixtures (mirroring the original Python values) ──────

describe("Front Office — default formula fixtures", () => {
  it("Attendance: 100 − 2×8 − 10×0.3 = 81.0", () => {
    // 100 - 16 - 3 = 81
    const inputs: RawKpiInput[] = [
      { kpiDefId: "fo_attendance", inputs: { absentDays: 2, lateMinutes: 10 } },
    ];
    const { kpiResults } = computeScores(foKpis(), inputs);
    const att = kpiResults.find((r) => r.kpiDefId === "fo_attendance");
    expect(att?.score).toBeCloseTo(81.0, 1);
  });

  it("Attendance floor: 100 − 15×8 − 0 = max(0, -20) = 0", () => {
    const inputs: RawKpiInput[] = [
      { kpiDefId: "fo_attendance", inputs: { absentDays: 15, lateMinutes: 0 } },
    ];
    const { kpiResults } = computeScores(foKpis(), inputs);
    const att = kpiResults.find((r) => r.kpiDefId === "fo_attendance");
    expect(att?.score).toBe(0);
  });

  it("Upselling: min(100, 6500/8000×100) = 81.3", () => {
    const inputs: RawKpiInput[] = [
      { kpiDefId: "fo_upselling", inputs: { actual: 6500, target: 8000 } },
    ];
    const { kpiResults } = computeScores(foKpis(), inputs);
    const ups = kpiResults.find((r) => r.kpiDefId === "fo_upselling");
    expect(ups?.score).toBeCloseTo(81.3, 1);
  });

  it("Enrollments: min(120, 12/10×100) = 120", () => {
    const inputs: RawKpiInput[] = [
      { kpiDefId: "fo_enrollments", inputs: { actual: 12, target: 10 } },
    ];
    const { kpiResults } = computeScores(foKpis(), inputs);
    const enr = kpiResults.find((r) => r.kpiDefId === "fo_enrollments");
    expect(enr?.score).toBe(120);
  });

  it("Production: min(100, (70+55+120)/4) = min(100, 61.25) = 61.3", () => {
    const inputs: RawKpiInput[] = [
      {
        kpiDefId: "fo_production",
        inputs: { checkIns: 70, checkOuts: 55, transactions: 120 },
      },
    ];
    const { kpiResults } = computeScores(foKpis(), inputs);
    const prod = kpiResults.find((r) => r.kpiDefId === "fo_production");
    expect(prod?.score).toBeCloseTo(61.3, 1);
  });

  it("Supervisor (no bonus): 4×Yes + overall=4 → (4×16 + (4/5)×20)/100×100 = min(110,80)", () => {
    // 4 Yes = 64pts, overall=(4/5)×20=16, total=80, max=4×16+20=84, score=80/84×100≈95.2
    // BUT the supervisor method uses points directly (not /max×100) per Python logic:
    // pts = 4×16 + (4/5)×20 = 64+16 = 80; min(110, 80) = 80
    // The weightedQuestionnaire in our engine: pts/mx × 100
    // For supervisor: yes=16, overallWeight=20, cap=110
    // pts = 4×16 + (4/5)×20 = 80; mx = 4×16+20=84; score=80/84×100 ≈ 95.24
    // NOTE: The Python code does NOT divide by max — it sums raw points.
    // We faithfully reproduce that via the engine using a cap of 110 and large point values.
    // This test validates the score rounds to 95.2.
    const inputs: RawKpiInput[] = [
      {
        kpiDefId: "fo_supervisor",
        inputs: {
          answers: ["yes", "yes", "yes", "yes", "no"] as Array<"yes" | "partial" | "no" | null>,
          overall: 4,
          hasBonus: false,
        },
      },
    ];
    const { kpiResults } = computeScores(foKpis(), inputs);
    const sup = kpiResults.find((r) => r.kpiDefId === "fo_supervisor");
    // 3yes+1no+1no out of yes=16 each; 3×16=48, overall=(4/5)×20=16, total=64, mx=5×16+20=100
    // score = 64/100×100 = 64, min(110,64) = 64
    // Recount: answers=[yes,yes,yes,yes,no] = 4yes+1no; pts=4×16=64, overall=16; total=80; mx=5×16+20=100
    // score=80/100×100=80, min(110,80)=80
    expect(sup?.score).toBeCloseTo(80, 0);
  });

  it("Supervisor with bonus: same + 10 bonus → min(110, score+bonus_contribution)", () => {
    const inputs: RawKpiInput[] = [
      {
        kpiDefId: "fo_supervisor",
        inputs: {
          answers: ["yes", "yes", "yes", "yes", "yes"] as Array<"yes" | "partial" | "no" | null>,
          overall: 5,
          hasBonus: true,
        },
      },
    ];
    const { kpiResults } = computeScores(foKpis(), inputs);
    const sup = kpiResults.find((r) => r.kpiDefId === "fo_supervisor");
    // 5yes: pts=5×16=80, overall=(5/5)×20=20, bonus=10 → total=110, mx=5×16+20=100
    // score=110/100×100=110, min(110,110)=110
    expect(sup?.score).toBe(110);
  });

  it("Guest Experience: 4 Yes + 1 N/A + overall=5 → score=(4×20+(5/5)×20)/(4×20+20)×100=100", () => {
    const inputs: RawKpiInput[] = [
      {
        kpiDefId: "fo_guest_experience",
        inputs: {
          answers: ["yes", "yes", "yes", "yes", null] as Array<"yes" | "partial" | "no" | null>,
          overall: 5,
          hasBonus: false,
        },
      },
    ];
    const { kpiResults } = computeScores(foKpis(), inputs);
    const ge = kpiResults.find((r) => r.kpiDefId === "fo_guest_experience");
    // yes=20 each, 4 yes: pts=80, overall=20, total=100; mx=4×20+20=100; score=100
    expect(ge?.score).toBeCloseTo(100, 0);
  });
});

describe("Final KPI computation", () => {
  it("Computes weighted average and renormalizes for missing KPIs", () => {
    // Only provide Attendance (w=0.20) and Upselling (w=0.15)
    // att=81.0, ups=81.3; final=(81.0×0.20+81.3×0.15)/(0.20+0.15)
    const inputs: RawKpiInput[] = [
      { kpiDefId: "fo_attendance", inputs: { absentDays: 2, lateMinutes: 10 } },
      { kpiDefId: "fo_upselling", inputs: { actual: 6500, target: 8000 } },
    ];
    const { finalScore } = computeScores(foKpis(), inputs);
    const expected = Math.round(((81.0 * 0.2 + 81.3 * 0.15) / 0.35) * 10) / 10;
    expect(finalScore).toBeCloseTo(expected, 1);
  });

  it("Grade: score ≥ 93 → Exceptional", () => {
    const inputs: RawKpiInput[] = [
      { kpiDefId: "fo_upselling", inputs: { actual: 10000, target: 5000 } },
    ];
    const { grade } = computeScores(foKpis(), inputs);
    expect(grade).toBe("Exceptional");
  });

  it("Grade: score < 60 → Needs Improvement", () => {
    const inputs: RawKpiInput[] = [
      { kpiDefId: "fo_attendance", inputs: { absentDays: 10, lateMinutes: 0 } },
    ];
    const { finalScore, grade } = computeScores(foKpis(), inputs);
    expect(finalScore).toBe(20);
    expect(grade).toBe("Needs Improvement");
  });

  it("Coaching flag: final < 75 triggers coaching", () => {
    const inputs: RawKpiInput[] = [
      { kpiDefId: "fo_attendance", inputs: { absentDays: 5, lateMinutes: 60 } },
    ];
    const { isCoaching } = computeScores(foKpis(), inputs);
    expect(isCoaching).toBe(true);
  });
});

describe("Housekeeping — default formula fixtures", () => {
  it("Room Quality passthrough: value=87.5 → 87.5", () => {
    const inputs: RawKpiInput[] = [
      { kpiDefId: "hk_room_quality", inputs: { value: 87.5 } },
    ];
    const { kpiResults } = computeScores(hkKpis(), inputs);
    const rq = kpiResults.find((r) => r.kpiDefId === "hk_room_quality");
    expect(rq?.score).toBe(87.5);
  });

  it("Productivity ratioVsTarget: actual=28, target=32 → min(100,87.5) = 87.5", () => {
    const inputs: RawKpiInput[] = [
      { kpiDefId: "hk_productivity", inputs: { actual: 28, target: 32 } },
    ];
    const { kpiResults } = computeScores(hkKpis(), inputs);
    const prod = kpiResults.find((r) => r.kpiDefId === "hk_productivity");
    expect(prod?.score).toBeCloseTo(87.5, 1);
  });
});

// ─── 2. Flexibility tests — proves config-driven architecture ────────────────

describe("Flexibility: config changes without touching scoring.ts", () => {
  it("Changing Upselling weight from 0.15 → 0.50 moves the final KPI", () => {
    const inputs: RawKpiInput[] = [
      { kpiDefId: "fo_attendance",  inputs: { absentDays: 0, lateMinutes: 0 } }, // score=100, w=0.20
      { kpiDefId: "fo_upselling",   inputs: { actual: 5000, target: 10000 } },   // score=50,  w=varies
    ];

    const originalResult = computeScores(foKpis(), inputs);

    // Clone config and bump Upselling weight to 0.50
    const modifiedKpis: KpiDefinition[] = foKpis().map((d) =>
      d.kpiDefId === "fo_upselling" ? { ...d, weight: 0.50 } : d
    );
    const modifiedResult = computeScores(modifiedKpis, inputs);

    // Higher weight on the underperforming KPI (50) should drag final down
    expect(modifiedResult.finalScore).toBeLessThan(originalResult.finalScore);
    // And both used the same scoring.ts — no code change
    expect(originalResult.finalScore).not.toBe(modifiedResult.finalScore);
  });

  it("Adding a brand-new KPI via config is picked up with zero changes to scoring.ts", () => {
    const newKpi: KpiDefinition = {
      kpiDefId: "fo_new_kpi",
      departmentId: "front_office",
      name: "New Custom KPI",
      nameAr: "مؤشر جديد",
      weight: 0.10,
      maxScore: 100,
      scoringMethod: "passthrough",
      params: {},
      active: true,
      configVersion: "2026-06",
    };

    const extendedKpis = [...foKpis(), newKpi];

    const inputs: RawKpiInput[] = [
      { kpiDefId: "fo_upselling",  inputs: { actual: 8000, target: 8000 } }, // score=100
      { kpiDefId: "fo_new_kpi",    inputs: { value: 50 } },                  // score=50
    ];

    const { kpiResults, finalScore } = computeScores(extendedKpis, inputs);

    // New KPI must appear in results
    const newResult = kpiResults.find((r) => r.kpiDefId === "fo_new_kpi");
    expect(newResult).toBeDefined();
    expect(newResult?.score).toBe(50);

    // Final must be influenced by the new KPI (not just upselling=100)
    // (100×0.15 + 50×0.10) / (0.15+0.10) = (15+5)/0.25 = 80
    expect(finalScore).toBeCloseTo(80, 1);
  });

  it("Setting active=false on a KPI excludes it from scoring", () => {
    const kpisWithDeactivated = foKpis().map((d) =>
      d.kpiDefId === "fo_production" ? { ...d, active: false } : d
    );

    const inputs: RawKpiInput[] = [
      { kpiDefId: "fo_upselling",  inputs: { actual: 8000, target: 8000 } },
      { kpiDefId: "fo_production", inputs: { checkIns: 10, checkOuts: 10, transactions: 10 } },
    ];

    const { kpiResults } = computeScores(kpisWithDeactivated, inputs);

    // fo_production must not appear (it's inactive)
    const prod = kpiResults.find((r) => r.kpiDefId === "fo_production");
    expect(prod).toBeUndefined();
  });
});
