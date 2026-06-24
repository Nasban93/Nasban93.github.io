import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";
import type { SeedData } from "../domain/types";
import { KPI_DEFINITIONS } from "../config/kpiConfig";
import { computeFromStoredScores } from "../domain/scoring";
import { GradeBadge } from "../components/GradeBadge";
import { ChartFrame } from "../components/ChartFrame";
import { gradeColor } from "../theme/tokens";
import { useT, useLang } from "../i18n/useT";
import { SyntheticDisclaimer } from "../components/SyntheticDisclaimer";
import { PIP_PRESETS_EN, PIP_PRESETS_AR } from "../components/PipPresets";
import { COACHING_THRESHOLD } from "../config/gradeBands";
import type { Grade } from "../domain/types";

const PERIODS = ["2025-11","2025-12","2026-01","2026-02","2026-03","2026-04"];
const PERIOD_LABELS: Record<string, string> = {
  "2025-11":"Nov 2025","2025-12":"Dec 2025","2026-01":"Jan 2026",
  "2026-02":"Feb 2026","2026-03":"Mar 2026","2026-04":"Apr 2026",
};

const TT_STYLE = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text)",
  boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
};
const KPI_COLORS = ["#C9A227","#2563EB","#16A34A","#8B5CF6","#EC4899","#14B8A6"];

type StaffFilter = "all" | "direct" | "casual";

interface Props { data: SeedData }

export function DepartmentHead({ data }: Props) {
  const t = useT();
  const { lang } = useLang();
  const isAr = lang === "ar";

  const [deptId, setDeptId] = useState<"front_office" | "housekeeping">("front_office");
  const [period, setPeriod] = useState("2026-04");
  const [search, setSearch] = useState("");
  const [staffFilter, setStaffFilter] = useState<StaffFilter>("all");

  const deptKpis = useMemo(
    () => KPI_DEFINITIONS.filter((k) => k.departmentId === deptId && k.active),
    [deptId]
  );

  const employeeResults = useMemo(() => {
    const deptEmps = data.employees.filter((e) => {
      if (e.departmentId !== deptId || e.employmentStatus !== "Active") return false;
      if (staffFilter === "direct") return e.staffType !== "casual";
      if (staffFilter === "casual") return e.staffType === "casual";
      return true;
    });
    return deptEmps
      .map((emp) => {
        const empScores = data.kpiScores.filter(
          (s) => s.employeeId === emp.employeeId && s.period === period
        );
        const result = computeFromStoredScores(deptKpis, empScores);
        return { emp, result };
      })
      .sort((a, b) => b.result.finalScore - a.result.finalScore);
  }, [data, deptId, period, deptKpis]);

  const filtered = useMemo(
    () => employeeResults.filter(({ emp }) =>
      emp.displayName.toLowerCase().includes(search.toLowerCase()) ||
      emp.fullNameAr.includes(search) ||
      emp.employeeId.toLowerCase().includes(search.toLowerCase())
    ),
    [employeeResults, search]
  );

  const coachingQueue = filtered.filter(({ result }) => result.isCoaching);

  const gradeDist = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const { result } of filtered) {
      counts[result.grade] = (counts[result.grade] ?? 0) + 1;
    }
    return Object.entries(counts).map(([grade, count]) => ({
      name: grade,
      value: count,
      fill: gradeColor(grade),
    }));
  }, [filtered]);

  const stackData = useMemo(() => filtered.slice(0, 20).map(({ emp, result }) => {
    const dispName = isAr ? emp.displayNameAr : emp.displayName;
    const row: Record<string, unknown> = { name: dispName.split(" ")[0] ?? dispName };
    const totalW = result.kpiResults.reduce((s, r) => s + (r.score != null ? r.weight : 0), 0);
    for (const kr of result.kpiResults) {
      if (kr.score != null && totalW > 0) {
        row[kr.name] = Math.round((kr.score * (kr.weight / totalW)) * 10) / 10;
      }
    }
    return row;
  }), [filtered]);

  const kpiNames = deptKpis.map((k) => (isAr ? k.nameAr : k.name));
  const kpiNameKeys = deptKpis.map((k) => k.name);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select value={deptId} onChange={(e) => setDeptId(e.target.value as typeof deptId)} className="ctrl">
          <option value="front_office">{isAr ? "مكتب الاستقبال" : "Front Office"}</option>
          <option value="housekeeping">{isAr ? "التدبير المنزلي" : "Housekeeping"}</option>
        </select>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="ctrl">
          {PERIODS.map((p) => <option key={p} value={p}>{PERIOD_LABELS[p]}</option>)}
        </select>
        <select value={staffFilter} onChange={(e) => setStaffFilter(e.target.value as StaffFilter)} className="ctrl">
          <option value="all">{t.allStaff}</option>
          <option value="direct">{t.directStaff}</option>
          <option value="casual">{t.casualStaff}</option>
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.search}
          className="ctrl flex-1 min-w-40"
        />
        <div className="text-sm" style={{ color: "var(--text-muted)" }}>
          {filtered.length} {isAr ? "موظف" : "employees"}
          {coachingQueue.length > 0 && (
            <span className="ml-2 font-medium" style={{ color: "#F97316" }}>
              · {coachingQueue.length} {isAr ? "بحاجة تدريب" : "need coaching"}
            </span>
          )}
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartFrame title={t.kpiBreakdown} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stackData} margin={{ left: -10, right: 10, bottom: 40 }}>
              <XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} domain={[0, 100]} />
              <Tooltip contentStyle={TT_STYLE} labelStyle={{ color: "var(--text)" }} />
              {kpiNameKeys.map((kpi, i) => (
                <Bar key={kpi} dataKey={kpi} stackId="a" fill={KPI_COLORS[i % KPI_COLORS.length]} name={kpiNames[i]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>

        <ChartFrame title={t.gradeDistribution}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={gradeDist} cx="50%" cy="45%" innerRadius={60} outerRadius={90} dataKey="value">
                {gradeDist.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip contentStyle={TT_STYLE} formatter={(v, name) => [v, isAr ? translateGrade(name as Grade, lang) : name]} />
              <Legend formatter={(v) => isAr ? translateGrade(v as Grade, lang) : v} wrapperStyle={{ fontSize: 11, color: "var(--text-muted)" }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartFrame>
      </div>

      {/* Team ranking table */}
      <ChartFrame title={t.teamRanking}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase" style={{ color: "var(--text-muted)" }}>
                <th className="text-start py-2 px-2">#</th>
                <th className="text-start py-2 px-2">{t.name}</th>
                <th className="text-start py-2 px-2">{t.finalKpi}</th>
                <th className="text-start py-2 px-2">{t.grade}</th>
                {deptKpis.map((k) => (
                  <th key={k.kpiDefId} className="text-start py-2 px-2 hidden md:table-cell">
                    {isAr ? k.nameAr : k.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ emp, result }, i) => (
                <tr
                  key={emp.employeeId}
                  className="border-t"
                  style={{
                    borderColor: "var(--border)",
                    backgroundColor: result.isCoaching ? "rgba(249,115,22,0.04)" : undefined,
                  }}
                >
                  <td className="py-2 px-2" style={{ color: "var(--text-muted)" }}>{i + 1}</td>
                  <td className="py-2 px-2 font-medium" style={{ color: "var(--text)" }}>
                    {isAr ? emp.displayNameAr : emp.displayName}
                    {emp.staffType === "casual" && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(37,99,235,0.12)", color: "var(--c-blue)" }}>
                        {isAr ? "شركة" : "Casual"}
                      </span>
                    )}
                    {result.isCoaching && <span className="ml-2 text-xs" style={{ color: "#F97316" }}>⚠</span>}
                  </td>
                  <td className="py-2 px-2 font-bold" style={{ color: gradeColor(result.grade) }}>
                    {result.finalScore}
                  </td>
                  <td className="py-2 px-2">
                    <GradeBadge grade={result.grade} size="sm" />
                  </td>
                  {deptKpis.map((k) => {
                    const kr = result.kpiResults.find((r) => r.kpiDefId === k.kpiDefId);
                    return (
                      <td key={k.kpiDefId} className="py-2 px-2 hidden md:table-cell" style={{ color: "var(--text-muted)" }}>
                        {kr?.score != null ? (
                          <span style={{ color: (kr.score < COACHING_THRESHOLD) ? "#F97316" : "var(--text)" }}>
                            {kr.score}
                          </span>
                        ) : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <SyntheticDisclaimer />
      </ChartFrame>

      {/* Coaching queue */}
      <ChartFrame title={t.coachingQueue}>
        {coachingQueue.length === 0 ? (
          <p className="text-sm py-4" style={{ color: "var(--text-muted)" }}>{t.noCoaching}</p>
        ) : (
          <div className="space-y-4">
            {coachingQueue.map(({ emp, result }) => {
              const lowest = result.kpiResults
                .filter((r) => r.score != null)
                .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0];
              const presets = isAr ? PIP_PRESETS_AR : PIP_PRESETS_EN;
              const plan = (lowest?.name != null ? presets[lowest.name] : undefined) ?? "Schedule a meeting with the supervisor.";
              return (
                <div key={emp.employeeId}
                  className="rounded-lg p-4"
                  style={{ border: "1px solid rgba(249,115,22,0.25)", backgroundColor: "rgba(249,115,22,0.04)" }}
                >
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="font-semibold" style={{ color: "var(--text)" }}>{isAr ? emp.displayNameAr : emp.displayName}</span>
                    {emp.staffType === "casual" && (
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(37,99,235,0.12)", color: "var(--c-blue)" }}>
                        {isAr ? "شركة" : "Casual"}
                      </span>
                    )}
                    <GradeBadge grade={result.grade} size="sm" />
                    <span className="text-sm font-medium" style={{ color: "#F97316" }}>{result.finalScore}</span>
                    {lowest && (
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {t.belowThreshold}: {isAr ? deptKpis.find(k => k.name === lowest.name)?.nameAr : lowest.name} ({lowest.score})
                      </span>
                    )}
                  </div>
                  <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed" style={{ color: "var(--text-muted)" }}>{plan}</pre>
                </div>
              );
            })}
          </div>
        )}
      </ChartFrame>
    </div>
  );
}

function translateGrade(grade: Grade | string, lang: string): string {
  if (lang !== "ar") return grade;
  const map: Record<string, string> = {
    Exceptional: "متميز", Excellent: "ممتاز", Good: "جيد",
    Fair: "مقبول", "Needs Improvement": "يحتاج تطوير",
  };
  return map[grade] ?? grade;
}
