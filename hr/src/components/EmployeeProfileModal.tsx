import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import type { SeedData } from "../domain/types";
import { KPI_DEFINITIONS } from "../config/kpiConfig";
import { computeFromStoredScores } from "../domain/scoring";
import { GradeBadge } from "./GradeBadge";
import { gradeColor, tokens } from "../theme/tokens";
import { useLang } from "../i18n/useT";
import { COACHING_THRESHOLD } from "../config/gradeBands";
import { PIP_PRESETS_EN, PIP_PRESETS_AR } from "./PipPresets";

const PERIODS = ["2025-11","2025-12","2026-01","2026-02","2026-03","2026-04"];
const PERIOD_LABELS: Record<string, string> = {
  "2025-11":"Nov 25","2025-12":"Dec 25","2026-01":"Jan 26",
  "2026-02":"Feb 26","2026-03":"Mar 26","2026-04":"Apr 26",
};
const DEPTS = [
  { id: "front_office", name: "Front Office", nameAr: "مكتب الاستقبال" },
  { id: "housekeeping",  name: "Housekeeping",  nameAr: "التدبير المنزلي" },
];

const TT_STYLE = {
  background: "var(--surface)", border: "1px solid var(--border)",
  borderRadius: 8, color: "var(--text)", boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
};

interface Props {
  employeeId: string;
  data: SeedData;
  onClose: () => void;
}

export function EmployeeProfileModal({ employeeId, data, onClose }: Props) {
  const { lang } = useLang();
  const isAr = lang === "ar";

  const emp = data.employees.find((e) => e.employeeId === employeeId);
  const vendor = emp?.vendorId ? data.vendors?.find((v) => v.id === emp.vendorId) : null;
  const dept = DEPTS.find((d) => d.id === emp?.departmentId);

  const deptKpis = useMemo(
    () => (emp ? KPI_DEFINITIONS.filter((k) => k.departmentId === emp.departmentId && k.active) : []),
    [emp]
  );

  // Per-period results
  const periodResults = useMemo(() => PERIODS.map((p) => {
    if (!emp) return { period: p, label: PERIOD_LABELS[p] ?? p, result: null };
    const scores = data.kpiScores.filter((s) => s.employeeId === emp.employeeId && s.period === p);
    const result = computeFromStoredScores(deptKpis, scores);
    return { period: p, label: PERIOD_LABELS[p] ?? p, result };
  }), [emp, data.kpiScores, deptKpis]);

  const latestResult = periodResults[periodResults.length - 1]?.result;

  const trendData = periodResults.map((pr) => ({
    period: pr.label,
    kpi: pr.result?.finalScore ?? 0,
  }));

  // Snapshots
  const snapshots = useMemo(
    () => PERIODS.map((p) => data.workforceSnapshots.find(
      (s) => s.employeeId === employeeId && s.period === p
    )),
    [data.workforceSnapshots, employeeId]
  );

  const lowestKpi = latestResult?.kpiResults
    .filter((r) => r.score != null)
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0];
  const pipPlan = lowestKpi?.name ? (isAr ? PIP_PRESETS_AR : PIP_PRESETS_EN)[lowestKpi.name] : null;

  if (!emp) return null;

  const jobLevel = data.jobLevels.find((l) => l.id === emp.jobLevelId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end"
      style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative h-full overflow-y-auto"
        style={{
          width: "min(780px, 100vw)",
          background: "var(--bg)",
          borderLeft: "1px solid var(--border)",
          boxShadow: "-8px 0 40px rgba(0,0,0,0.20)",
        }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between"
          style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold" style={{ color: "var(--text)" }}>
                {isAr ? emp.fullNameLongAr : emp.fullNameLong}
              </span>
              {emp.staffType === "casual" && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: "rgba(37,99,235,0.12)", color: "var(--c-blue)" }}>
                  {isAr ? "شركة" : "Casual"}
                </span>
              )}
            </div>
            <div className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
              {emp.employeeId} · {isAr ? emp.positionAr : emp.position}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {latestResult && (
              <>
                <span className="text-2xl font-bold" style={{ color: gradeColor(latestResult.grade) }}>
                  {latestResult.finalScore}
                </span>
                <GradeBadge grade={latestResult.grade} />
              </>
            )}
            <button onClick={onClose} className="ml-2 text-xl font-light"
              style={{ color: "var(--text-muted)", lineHeight: 1 }}>✕</button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Profile info grid */}
          <div className="card p-4">
            <div className="text-xs font-semibold uppercase tracking-wide mb-3"
              style={{ color: "var(--text-muted)" }}>
              {isAr ? "المعلومات الشخصية" : "Employee Profile"}
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[
                [isAr ? "القسم" : "Department",     isAr ? dept?.nameAr : dept?.name],
                [isAr ? "المسمى الوظيفي" : "Position", isAr ? emp.positionAr : emp.position],
                [isAr ? "الدرجة الوظيفية" : "Job Level", jobLevel ? `${jobLevel.id} — ${jobLevel.name}` : emp.jobLevelId],
                [isAr ? "نطاق الراتب" : "Salary Band", jobLevel ? `${jobLevel.salaryBandMin.toLocaleString()} – ${jobLevel.salaryBandMax.toLocaleString()} SAR` : "—"],
                [isAr ? "الجنسية" : "Nationality",  isAr ? (emp.nationality === "Saudi" ? "سعودي" : "غير سعودي") : emp.nationality],
                [isAr ? "الجنس" : "Gender",         isAr ? (emp.gender === "M" ? "ذكر" : "أنثى") : (emp.gender === "M" ? "Male" : "Female")],
                [isAr ? "العمر" : "Age",             `${emp.age}`],
                [isAr ? "المؤهل" : "Education",     emp.educationLevel],
                [isAr ? "تاريخ التعيين" : "Hire Date", emp.hireDate],
                [isAr ? "سنوات الخدمة" : "Tenure",  `${emp.tenureYears} ${isAr ? "سنة" : "yrs"}`],
                [isAr ? "مصدر التعيين" : "Source",  emp.sourceOfHire],
                [isAr ? "نوع التوظيف" : "Staff Type", emp.staffType === "casual"
                  ? (isAr ? "شركة خارجية" : "Casual / Vendor")
                  : (isAr ? "مباشر" : "Direct")],
                ...(emp.staffType === "casual" && vendor
                  ? [[isAr ? "الشركة" : "Vendor", isAr ? vendor.nameAr : vendor.name]]
                  : []),
              ].map(([label, value]) => (
                <div key={label as string}>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</div>
                  <div className="font-medium mt-0.5" style={{ color: "var(--text)" }}>{value || "—"}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Trend chart */}
          <div className="card p-4">
            <div className="text-xs font-semibold uppercase tracking-wide mb-3"
              style={{ color: "var(--text-muted)" }}>
              {isAr ? "اتجاه الأداء — 6 أشهر" : "Performance Trend — 6 months"}
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={trendData} margin={{ left: -10 }}>
                <XAxis dataKey="period" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                <YAxis domain={[40, 110]} tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                <Tooltip contentStyle={TT_STYLE} />
                <Line type="monotone" dataKey="kpi" stroke={tokens.gold} strokeWidth={2} dot={{ fill: tokens.gold, r: 4 }}
                  name={isAr ? "المؤشر النهائي" : "Final KPI"} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Full KPI history table */}
          <div className="card p-4">
            <div className="text-xs font-semibold uppercase tracking-wide mb-3"
              style={{ color: "var(--text-muted)" }}>
              {isAr ? "سجل المؤشرات الكاملة" : "Full KPI History"}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: 480 }}>
                <thead>
                  <tr className="text-xs uppercase" style={{ color: "var(--text-muted)" }}>
                    <th className="text-start py-2 px-2 font-semibold">{isAr ? "المؤشر" : "KPI"}</th>
                    <th className="text-start py-2 px-1 font-semibold" style={{ color: "var(--text-faint)", fontSize: "0.65rem" }}>
                      {isAr ? "الوزن" : "Wt"}
                    </th>
                    {PERIODS.map((p) => (
                      <th key={p} className="text-center py-2 px-2 font-semibold">
                        {PERIOD_LABELS[p]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deptKpis.map((kpi) => (
                    <tr key={kpi.kpiDefId} className="border-t" style={{ borderColor: "var(--border)" }}>
                      <td className="py-2 px-2 font-medium" style={{ color: "var(--text)" }}>
                        {isAr ? kpi.nameAr : kpi.name}
                      </td>
                      <td className="py-1 px-1 text-xs" style={{ color: "var(--text-faint)" }}>
                        {Math.round(kpi.weight * 100)}%
                      </td>
                      {periodResults.map(({ period, result }) => {
                        const kr = result?.kpiResults.find((r) => r.kpiDefId === kpi.kpiDefId);
                        const score = kr?.score;
                        return (
                          <td key={period} className="py-2 px-2 text-center font-medium"
                            style={{ color: score == null ? "var(--text-faint)" : score < COACHING_THRESHOLD ? "#F97316" : gradeColor(result?.grade ?? "Good") }}>
                            {score ?? "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {/* Final row */}
                  <tr className="border-t" style={{ borderColor: "var(--gold-bg)", background: "var(--gold-bg)" }}>
                    <td className="py-2 px-2 font-bold" style={{ color: "var(--gold)" }}>
                      {isAr ? "المؤشر النهائي" : "Final Score"}
                    </td>
                    <td />
                    {periodResults.map(({ period, result }) => (
                      <td key={period} className="py-2 px-2 text-center font-bold"
                        style={{ color: result ? gradeColor(result.grade) : "var(--text-faint)" }}>
                        {result?.finalScore ?? "—"}
                      </td>
                    ))}
                  </tr>
                  {/* Grade row */}
                  <tr className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="py-2 px-2 text-xs font-semibold uppercase" style={{ color: "var(--text-muted)" }}>
                      {isAr ? "التقييم" : "Grade"}
                    </td>
                    <td />
                    {periodResults.map(({ period, result }) => (
                      <td key={period} className="py-1 px-1 text-center">
                        {result && result.finalScore > 0
                          ? <GradeBadge grade={result.grade} size="sm" />
                          : <span style={{ color: "var(--text-faint)" }}>—</span>}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Workforce snapshots table */}
          <div className="card p-4">
            <div className="text-xs font-semibold uppercase tracking-wide mb-3"
              style={{ color: "var(--text-muted)" }}>
              {isAr ? "بيانات القوى العاملة" : "Workforce Snapshots"}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: 440 }}>
                <thead>
                  <tr className="text-xs uppercase" style={{ color: "var(--text-muted)" }}>
                    <th className="text-start py-2 px-2">{isAr ? "الفترة" : "Period"}</th>
                    <th className="text-start py-2 px-2">{isAr ? "الراتب" : "Salary (SAR)"}</th>
                    <th className="text-start py-2 px-2">{isAr ? "ساعات التدريب" : "Training Hrs"}</th>
                    <th className="text-start py-2 px-2">{isAr ? "تقييم الأداء" : "Perf. Rating"}</th>
                  </tr>
                </thead>
                <tbody>
                  {PERIODS.map((p, i) => {
                    const snap = snapshots[i];
                    return (
                      <tr key={p} className="border-t" style={{ borderColor: "var(--border)" }}>
                        <td className="py-2 px-2 font-medium" style={{ color: "var(--text)" }}>
                          {PERIOD_LABELS[p]}
                        </td>
                        <td className="py-2 px-2" style={{ color: "var(--text-muted)" }}>
                          {snap ? snap.monthlySalary.toLocaleString() : "—"}
                        </td>
                        <td className="py-2 px-2" style={{ color: "var(--text-muted)" }}>
                          {snap ? `${snap.trainingHoursYtd}h` : "—"}
                        </td>
                        <td className="py-2 px-2 font-medium"
                          style={{ color: snap?.performanceRating != null
                            ? gradeColor(snap.performanceRating >= 93 ? "Exceptional" : snap.performanceRating >= 85 ? "Excellent" : snap.performanceRating >= 75 ? "Good" : snap.performanceRating >= 60 ? "Fair" : "Needs Improvement")
                            : "var(--text-faint)" }}>
                          {snap?.performanceRating ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action plan if in coaching */}
          {latestResult?.isCoaching && pipPlan && (
            <div className="card p-4" style={{ border: "1px solid rgba(249,115,22,0.3)", background: "rgba(249,115,22,0.04)" }}>
              <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#F97316" }}>
                ⚠ {isAr ? "خطة التحسين" : "Improvement Plan"}
              </div>
              <div className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>
                {isAr ? "مجال التركيز:" : "Focus area:"}{" "}
                <span className="font-medium" style={{ color: "#F97316" }}>
                  {isAr ? deptKpis.find(k => k.name === lowestKpi?.name)?.nameAr : lowestKpi?.name} ({lowestKpi?.score})
                </span>
              </div>
              <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {pipPlan}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
