import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import type { SeedData } from "../domain/types";
import { KPI_DEFINITIONS } from "../config/kpiConfig";
import { computeFromStoredScores } from "../domain/scoring";
import { StatCard } from "../components/StatCard";
import { ChartFrame } from "../components/ChartFrame";
import { GradeBadge } from "../components/GradeBadge";
import { gradeColor, tokens } from "../theme/tokens";
import { useT, useLang } from "../i18n/useT";
import { SyntheticDisclaimer } from "../components/SyntheticDisclaimer";
import type { Grade } from "../domain/types";

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
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text)",
  boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
};

interface Props { data: SeedData }

export function HrManager({ data }: Props) {
  const t = useT();
  const { lang } = useLang();
  const isAr = lang === "ar";
  const [period, setPeriod] = useState("2026-04");

  const employeeResults = useMemo(() => {
    return data.employees
      .filter((e) => e.employmentStatus === "Active")
      .map((emp) => {
        const deptKpis = KPI_DEFINITIONS.filter((k) => k.departmentId === emp.departmentId && k.active);
        const empScores = data.kpiScores.filter((s) => s.employeeId === emp.employeeId && s.period === period);
        const result = computeFromStoredScores(deptKpis, empScores);
        return { emp, result };
      });
  }, [data, period]);

  const deptAvgs = useMemo(() => DEPTS.map((dept) => {
    const deptResults = employeeResults.filter((r) => r.emp.departmentId === dept.id);
    const scores = deptResults.map((r) => r.result.finalScore).filter((s) => s > 0);
    return {
      dept: isAr ? dept.nameAr : dept.name,
      avg: scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0,
    };
  }), [employeeResults, isAr]);

  const gradeDist = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const { result } of employeeResults) {
      counts[result.grade] = (counts[result.grade] ?? 0) + 1;
    }
    return Object.entries(counts).map(([grade, count]) => ({
      name: isAr ? translateGrade(grade as Grade) : grade,
      value: count,
      fill: gradeColor(grade),
    }));
  }, [employeeResults, isAr]);

  const coachingCount = employeeResults.filter((r) => r.result.isCoaching).length;
  const avgKpi = useMemo(() => {
    const scores = employeeResults.map((r) => r.result.finalScore).filter((s) => s > 0);
    return scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0;
  }, [employeeResults]);

  const exitReasons = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ex of data.exitRecords) {
      counts[ex.terminationReason] = (counts[ex.terminationReason] ?? 0) + 1;
    }
    return Object.entries(counts).map(([reason, count]) => ({ reason, count }));
  }, [data.exitRecords]);

  const trainingByDept = useMemo(() => DEPTS.map((dept) => {
    const deptEmps = data.employees.filter((e) => e.departmentId === dept.id && e.employmentStatus === "Active");
    const snaps = data.workforceSnapshots.filter(
      (s) => s.period === period && deptEmps.some((e) => e.employeeId === s.employeeId)
    );
    const avg = snaps.length > 0
      ? Math.round(snaps.reduce((a, b) => a + b.trainingHoursYtd, 0) / snaps.length) : 0;
    return { dept: isAr ? dept.nameAr : dept.name, avg };
  }), [data, period, isAr]);

  const kpiTrend = useMemo(() => PERIODS.map((p) => {
    const snaps = data.workforceSnapshots.filter(
      (s) => s.period === p && data.employees.find((e) => e.employeeId === s.employeeId)?.employmentStatus === "Active"
    );
    const scores = snaps.map((s) => s.performanceRating).filter((v): v is number => v != null);
    return {
      period: PERIOD_LABELS[p] ?? p,
      avg: scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0,
    };
  }), [data]);

  return (
    <div className="space-y-6">
      <div className="flex gap-3 items-center">
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="ctrl">
          {PERIODS.map((p) => <option key={p} value={p}>{PERIOD_LABELS[p]}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={isAr ? "إجمالي الموظفين" : "Total Active"} value={employeeResults.length} />
        <StatCard label={t.avgPerformance} value={avgKpi} accent="var(--gold)" />
        <StatCard label={t.coachingLoad} value={coachingCount}
          sub={`${Math.round((coachingCount / Math.max(1, employeeResults.length)) * 100)}% ${isAr ? "يحتاجون تدريباً" : "need coaching"}`}
          accent="#F97316" />
        <StatCard label={isAr ? "إجمالي المغادرة" : "Total Exits"} value={data.exitRecords.length}
          sub={isAr ? "في جميع الفترات" : "across all periods"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartFrame title={t.avgKpiByDept} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={deptAvgs} margin={{ left: -10 }}>
              <XAxis dataKey="dept" tick={{ fill: "var(--text-muted)", fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
              <Tooltip contentStyle={TT_STYLE} />
              <Bar dataKey="avg" fill={tokens.gold} radius={[4, 4, 0, 0]} name={isAr ? "متوسط المؤشر" : "Avg KPI"} />
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>

        <ChartFrame title={t.gradeDistribution}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={gradeDist} cx="50%" cy="45%" innerRadius={50} outerRadius={80} dataKey="value">
                {gradeDist.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip contentStyle={TT_STYLE} />
              <Legend wrapperStyle={{ fontSize: 10, color: "var(--text-muted)" }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartFrame>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartFrame title={t.kpiTrend} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={kpiTrend} margin={{ left: -10 }}>
              <XAxis dataKey="period" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
              <YAxis domain={[60, 100]} tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
              <Tooltip contentStyle={TT_STYLE} />
              <Line type="monotone" dataKey="avg" stroke={tokens.gold} strokeWidth={2} dot={{ fill: tokens.gold, r: 4 }} name={t.avgPerformance} />
            </LineChart>
          </ResponsiveContainer>
        </ChartFrame>

        <ChartFrame title={t.turnover}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={exitReasons} layout="vertical" margin={{ left: 20 }}>
              <XAxis type="number" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
              <YAxis type="category" dataKey="reason" tick={{ fill: "var(--text-muted)", fontSize: 10 }} width={90} />
              <Tooltip contentStyle={TT_STYLE} />
              <Bar dataKey="count" fill={tokens.poor} radius={[0, 4, 4, 0]} name={isAr ? "العدد" : "Count"} />
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      </div>

      <ChartFrame title={t.trainingCompletion}>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={trainingByDept} margin={{ left: -10 }}>
            <XAxis dataKey="dept" tick={{ fill: "var(--text-muted)", fontSize: 12 }} />
            <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
            <Tooltip contentStyle={TT_STYLE} />
            <Bar dataKey="avg" fill={tokens.blue} radius={[4, 4, 0, 0]} name={isAr ? "متوسط الساعات" : "Avg Hrs"} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame title={t.coachingQueue}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase" style={{ color: "var(--text-muted)" }}>
                <th className="text-start py-2 px-2">{t.name}</th>
                <th className="text-start py-2 px-2">{t.department}</th>
                <th className="text-start py-2 px-2">{t.finalKpi}</th>
                <th className="text-start py-2 px-2">{t.grade}</th>
              </tr>
            </thead>
            <tbody>
              {employeeResults
                .filter((r) => r.result.isCoaching)
                .sort((a, b) => a.result.finalScore - b.result.finalScore)
                .map(({ emp, result }) => {
                  const deptName = DEPTS.find((d) => d.id === emp.departmentId);
                  return (
                    <tr key={emp.employeeId}
                      className="border-t"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <td className="py-2 px-2 font-medium" style={{ color: "var(--text)" }}>{isAr ? emp.displayNameAr : emp.displayName}</td>
                      <td className="py-2 px-2" style={{ color: "var(--text-muted)" }}>
                        {isAr ? deptName?.nameAr : deptName?.name}
                      </td>
                      <td className="py-2 px-2 font-bold" style={{ color: gradeColor(result.grade) }}>
                        {result.finalScore}
                      </td>
                      <td className="py-2 px-2">
                        <GradeBadge grade={result.grade} size="sm" />
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        <SyntheticDisclaimer />
      </ChartFrame>
    </div>
  );
}

function translateGrade(grade: Grade): string {
  const map: Record<Grade, string> = {
    Exceptional: "متميز", Excellent: "ممتاز", Good: "جيد",
    Fair: "مقبول", "Needs Improvement": "يحتاج تطوير",
  };
  return map[grade] ?? grade;
}
