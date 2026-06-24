import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";
import type { SeedData } from "../domain/types";
import { KPI_DEFINITIONS } from "../config/kpiConfig";
import { computeFromStoredScores } from "../domain/scoring";
import { GradeBadge } from "../components/GradeBadge";
import { ChartFrame } from "../components/ChartFrame";
import { tokens, gradeColor } from "../theme/tokens";
import { useT, useLang } from "../i18n/useT";
import { PIP_PRESETS_EN, PIP_PRESETS_AR } from "../components/PipPresets";
import { SyntheticDisclaimer } from "../components/SyntheticDisclaimer";
import { COACHING_THRESHOLD } from "../config/gradeBands";

const PERIODS = ["2025-11","2025-12","2026-01","2026-02","2026-03","2026-04"];
const PERIOD_LABELS: Record<string, string> = {
  "2025-11":"Nov","2025-12":"Dec","2026-01":"Jan",
  "2026-02":"Feb","2026-03":"Mar","2026-04":"Apr",
};

const TT_STYLE = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text)",
  boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
};

interface Props { data: SeedData }

export function EmployeeSelf({ data }: Props) {
  const t = useT();
  const { lang } = useLang();
  const isAr = lang === "ar";

  const activeEmps = data.employees.filter((e) => e.employmentStatus === "Active");
  const [empId, setEmpId] = useState(activeEmps[0]?.employeeId ?? "");

  const emp = useMemo(() => activeEmps.find((e) => e.employeeId === empId), [activeEmps, empId]);

  const deptKpis = useMemo(
    () => (emp ? KPI_DEFINITIONS.filter((k) => k.departmentId === emp.departmentId && k.active) : []),
    [emp]
  );

  const kpiTrend = useMemo(() => {
    if (!emp) return [];
    return PERIODS.map((p) => {
      const scores = data.kpiScores.filter((s) => s.employeeId === emp.employeeId && s.period === p);
      const result = computeFromStoredScores(deptKpis, scores);
      return { period: PERIOD_LABELS[p] ?? p, kpi: result.finalScore };
    });
  }, [emp, data.kpiScores, deptKpis]);

  const latestResult = useMemo(() => {
    if (!emp) return null;
    const scores = data.kpiScores.filter((s) => s.employeeId === emp.employeeId && s.period === "2026-04");
    return computeFromStoredScores(deptKpis, scores);
  }, [emp, data.kpiScores, deptKpis]);

  const teamAvgKpis = useMemo(() => {
    if (!emp) return {};
    const teammates = data.employees.filter(
      (e) => e.departmentId === emp.departmentId && e.employmentStatus === "Active" && e.employeeId !== empId
    );
    const avgs: Record<string, number> = {};
    for (const kpi of deptKpis) {
      const scores = teammates.flatMap((te) =>
        data.kpiScores.filter((s) => s.employeeId === te.employeeId && s.period === "2026-04" && s.kpiDefId === kpi.kpiDefId)
      ).map((s) => s.score).filter((v): v is number => v != null);
      avgs[kpi.kpiDefId] = scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
        : 0;
    }
    return avgs;
  }, [emp, empId, data.kpiScores, data.employees, deptKpis]);

  const radarData = useMemo(() => {
    if (!latestResult) return [];
    return latestResult.kpiResults.map((kr) => ({
      kpi: isAr ? deptKpis.find((d) => d.kpiDefId === kr.kpiDefId)?.nameAr ?? kr.name : kr.name,
      me: kr.score ?? 0,
      team: teamAvgKpis[kr.kpiDefId] ?? 0,
    }));
  }, [latestResult, teamAvgKpis, isAr, deptKpis]);

  const lowestKpi = latestResult?.kpiResults
    .filter((r) => r.score != null)
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0];

  const pipPresets = isAr ? PIP_PRESETS_AR : PIP_PRESETS_EN;
  const pipPlan = lowestKpi?.name != null ? pipPresets[lowestKpi.name] : null;

  return (
    <div className="space-y-6">
      {/* Employee selector */}
      <div className="flex flex-wrap gap-3 items-center">
        <select value={empId} onChange={(e) => setEmpId(e.target.value)} className="ctrl min-w-60">
          {activeEmps.map((e) => (
            <option key={e.employeeId} value={e.employeeId}>
              {e.employeeId} — {isAr ? e.displayNameAr : e.displayName}
            </option>
          ))}
        </select>
        <SyntheticDisclaimer />
        {emp && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>
              {emp.position} · {emp.departmentId === "front_office" ? (isAr ? "مكتب الاستقبال" : "Front Office") : (isAr ? "التدبير المنزلي" : "Housekeeping")}
            </span>
            {emp.staffType === "casual" && (() => {
              const vendor = data.vendors?.find((v) => v.id === emp.vendorId);
              return (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(37,99,235,0.12)", color: "var(--c-blue)" }}>
                  {isAr ? "موظف شركة" : "Casual"}{vendor ? ` · ${isAr ? vendor.nameAr : vendor.name}` : ""}
                </span>
              );
            })()}
          </div>
        )}
      </div>

      {emp && latestResult && (
        <>
          {/* Summary card */}
          <div
            className="card p-5 flex flex-wrap gap-6 items-center surface-transition"
          >
            <div>
              <div className="flex items-center gap-2">
                <div className="text-lg font-bold" style={{ color: "var(--text)" }}>{isAr ? emp.displayNameAr : emp.displayName}</div>
                {emp.staffType === "casual" && (
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(37,99,235,0.12)", color: "var(--c-blue)" }}>
                    {isAr ? "شركة" : "Casual"}
                  </span>
                )}
              </div>
              <div className="text-sm" style={{ color: "var(--text-muted)" }}>
                {emp.employeeId} · {emp.position}
                {emp.staffType === "casual" && emp.vendorId && (() => {
                  const v = data.vendors?.find((vd) => vd.id === emp.vendorId);
                  return v ? ` · ${isAr ? v.nameAr : v.name}` : "";
                })()}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-3xl font-bold" style={{ color: gradeColor(latestResult.grade) }}>
                {latestResult.finalScore}
              </div>
              <GradeBadge grade={latestResult.grade} />
            </div>
            {latestResult.isCoaching && (
              <div className="rounded-lg px-4 py-2 text-sm"
                style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.30)", color: "#F97316" }}>
                ⚠ {isAr ? "أنت في قائمة الدعم — راجع خطة التحسين أدناه" : "You're in the coaching queue — see improvement plan below"}
              </div>
            )}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartFrame title={t.myKpiTrend}>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={kpiTrend} margin={{ left: -10 }}>
                  <XAxis dataKey="period" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                  <YAxis domain={[40, 110]} tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                  <Tooltip contentStyle={TT_STYLE} />
                  <Line type="monotone" dataKey="kpi" stroke={tokens.gold} strokeWidth={2} dot={{ fill: tokens.gold, r: 5 }} name={isAr ? "مؤشري" : "My KPI"} />
                  <Line type="monotone" data={kpiTrend.map((d) => ({ ...d, threshold: COACHING_THRESHOLD }))}
                    dataKey="threshold" stroke="#F97316" strokeWidth={1} strokeDasharray="4 4" dot={false}
                    name={isAr ? "حد التدريب" : "Coaching threshold"} />
                </LineChart>
              </ResponsiveContainer>
            </ChartFrame>

            <ChartFrame title={t.myKpiRadar}>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="kpi" tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
                  <Radar name={isAr ? "أنا" : "Me"} dataKey="me" stroke={tokens.gold} fill={tokens.gold} fillOpacity={0.3} />
                  <Radar name={isAr ? "متوسط الفريق" : "Team Avg"} dataKey="team" stroke={tokens.blue} fill={tokens.blue} fillOpacity={0.15} />
                  <Tooltip contentStyle={TT_STYLE} />
                </RadarChart>
              </ResponsiveContainer>
            </ChartFrame>
          </div>

          {/* KPI breakdown */}
          <ChartFrame title={t.kpiBreakdown}>
            <div className="space-y-3">
              {latestResult.kpiResults.map((kr) => (
                <div key={kr.kpiDefId}>
                  <div className="flex justify-between text-sm mb-1">
                    <span style={{ color: "var(--text)" }}>
                      {isAr ? deptKpis.find(k => k.kpiDefId === kr.kpiDefId)?.nameAr : kr.name}
                    </span>
                    <span className="font-semibold"
                      style={{ color: (kr.score ?? 0) < COACHING_THRESHOLD ? "#F97316" : "var(--text)" }}>
                      {kr.score ?? "—"}
                    </span>
                  </div>
                  <div className="w-full rounded-full h-1.5" style={{ background: "var(--border)" }}>
                    <div className="h-1.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, kr.score ?? 0)}%`,
                        backgroundColor: (kr.score ?? 0) < COACHING_THRESHOLD ? "#F97316" : tokens.gold,
                      }} />
                  </div>
                </div>
              ))}
            </div>
          </ChartFrame>

          {/* Action plan */}
          {latestResult.isCoaching && pipPlan && (
            <ChartFrame title={t.myActionPlan}>
              <div className="mb-2 text-sm" style={{ color: "var(--text-muted)" }}>
                {isAr ? "مجال التحسين:" : "Focus area:"}{" "}
                <span className="font-medium" style={{ color: "#F97316" }}>
                  {isAr ? deptKpis.find(k => k.name === lowestKpi?.name)?.nameAr : lowestKpi?.name}
                  {" "}({lowestKpi?.score})
                </span>
              </div>
              <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {pipPlan}
              </pre>
            </ChartFrame>
          )}
        </>
      )}
    </div>
  );
}
