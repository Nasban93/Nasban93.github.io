import type { Employee, WorkforceSnapshot, ExitRecord } from "../domain/types";

export interface OrgRollup {
  headcount: number;
  directCount: number;
  casualCount: number;
  saudizationRate: number;
  nitaqatBand: "Red" | "Yellow" | "Green" | "Platinum";
  femaleRate: number;
  attritionRate: number;
  avgPerformance: number | null;
  avgTrainingHours: number;
}

function nitaqatFromRate(rate: number): "Red" | "Yellow" | "Green" | "Platinum" {
  if (rate >= 0.60) return "Platinum";
  if (rate >= 0.40) return "Green";
  if (rate >= 0.25) return "Yellow";
  return "Red";
}

export function computeOrgRollup(
  employees: Employee[],
  snapshots: WorkforceSnapshot[],
  exits: ExitRecord[],
  period: string,
  deptId?: string
): OrgRollup {
  const active = employees.filter(
    (e) =>
      e.employmentStatus === "Active" &&
      (!deptId || e.departmentId === deptId)
  );

  const headcount = active.length;
  const directEmps = active.filter((e) => e.staffType !== "casual");
  const directCount = directEmps.length;
  const casualCount = headcount - directCount;
  const femaleCount = active.filter((e) => e.gender === "F").length;

  // Nitaqat/Saudization only counts direct (hotel-payroll) employees —
  // casual staff are on vendor payroll and excluded from the Nitaqat calculation.
  const saudiDirect = directEmps.filter((e) => e.nationality === "Saudi").length;
  const saudizationRate = directCount > 0 ? saudiDirect / directCount : 0;
  const femaleRate = headcount > 0 ? femaleCount / headcount : 0;
  const nitaqatBand = nitaqatFromRate(saudizationRate);

  // Attrition: exits in trailing 12 months / avg headcount
  const periods = ["2025-11","2025-12","2026-01","2026-02","2026-03","2026-04"];
  const periodIdx = periods.indexOf(period);
  const windowStart = periods[Math.max(0, periodIdx - 11)] ?? periods[0]!;
  const recentExits = exits.filter(
    (ex) =>
      ex.period >= windowStart &&
      ex.period <= period &&
      (!deptId ||
        employees.find((e) => e.employeeId === ex.employeeId)?.departmentId === deptId)
  );
  const attritionRate =
    headcount + recentExits.length > 0
      ? recentExits.length / (headcount + recentExits.length / 2)
      : 0;

  // Performance and training from snapshots for this period
  const periodSnaps = snapshots.filter(
    (s) =>
      s.period === period &&
      active.some((e) => e.employeeId === s.employeeId) &&
      (!deptId ||
        employees.find((e) => e.employeeId === s.employeeId)?.departmentId === deptId)
  );

  const perfValues = periodSnaps
    .map((s) => s.performanceRating)
    .filter((v): v is number => v != null);
  const avgPerformance =
    perfValues.length > 0
      ? Math.round((perfValues.reduce((a, b) => a + b, 0) / perfValues.length) * 10) / 10
      : null;

  const trainingValues = periodSnaps.map((s) => s.trainingHoursYtd);
  const avgTrainingHours =
    trainingValues.length > 0
      ? Math.round(trainingValues.reduce((a, b) => a + b, 0) / trainingValues.length)
      : 0;

  return {
    headcount,
    directCount,
    casualCount,
    saudizationRate,
    nitaqatBand,
    femaleRate,
    attritionRate,
    avgPerformance,
    avgTrainingHours,
  };
}

export interface DeptAvg {
  deptId: string;
  deptName: string;
  avgScore: number;
  headcount: number;
}

export function computeDeptAverages(
  employees: Employee[],
  snapshots: WorkforceSnapshot[],
  period: string
): DeptAvg[] {
  const depts = [
    { id: "front_office", name: "Front Office", nameAr: "مكتب الاستقبال" },
    { id: "housekeeping",  name: "Housekeeping",  nameAr: "التدبير المنزلي" },
  ];
  return depts.map((dept) => {
    const deptEmps = employees.filter(
      (e) => e.departmentId === dept.id && e.employmentStatus === "Active"
    );
    const snaps = snapshots.filter(
      (s) =>
        s.period === period &&
        deptEmps.some((e) => e.employeeId === s.employeeId)
    );
    const scores = snaps
      .map((s) => s.performanceRating)
      .filter((v): v is number => v != null);
    return {
      deptId: dept.id,
      deptName: dept.name,
      avgScore:
        scores.length > 0
          ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
          : 0,
      headcount: deptEmps.length,
    };
  });
}

export interface PeriodTrend {
  period: string;
  label: string;
  avgScore: number;
  headcount: number;
  exits: number;
}

const PERIOD_LABELS: Record<string, string> = {
  "2025-11": "Nov", "2025-12": "Dec",
  "2026-01": "Jan", "2026-02": "Feb",
  "2026-03": "Mar", "2026-04": "Apr",
};

export function computePeriodTrends(
  employees: Employee[],
  snapshots: WorkforceSnapshot[],
  exits: ExitRecord[],
  periods: string[],
  deptId?: string
): PeriodTrend[] {
  return periods.map((period) => {
    const active = employees.filter(
      (e) =>
        e.employmentStatus === "Active" &&
        (!deptId || e.departmentId === deptId)
    );
    const snaps = snapshots.filter(
      (s) =>
        s.period === period &&
        active.some((e) => e.employeeId === s.employeeId) &&
        (!deptId ||
          employees.find((e) => e.employeeId === s.employeeId)?.departmentId === deptId)
    );
    const scores = snaps.map((s) => s.performanceRating).filter((v): v is number => v != null);
    const periodExits = exits.filter(
      (ex) =>
        ex.period === period &&
        (!deptId ||
          employees.find((e) => e.employeeId === ex.employeeId)?.departmentId === deptId)
    );
    return {
      period,
      label: PERIOD_LABELS[period] ?? period,
      avgScore:
        scores.length > 0
          ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
          : 0,
      headcount: active.length,
      exits: periodExits.length,
    };
  });
}
