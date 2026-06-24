import { useState, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar,
} from "recharts";
import type { SeedData } from "../domain/types";
import { StatCard } from "../components/StatCard";
import { ChartFrame } from "../components/ChartFrame";
import { tokens, nitaqatColor } from "../theme/tokens";
import { useT, useLang } from "../i18n/useT";
import { computeOrgRollup, computePeriodTrends } from "../rollups/org";

const PERIODS = ["2025-11","2025-12","2026-01","2026-02","2026-03","2026-04"];
const PERIOD_LABELS: Record<string, string> = {
  "2025-11":"Nov 25","2025-12":"Dec 25","2026-01":"Jan 26",
  "2026-02":"Feb 26","2026-03":"Mar 26","2026-04":"Apr 26",
};

const TT_STYLE = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text)",
  boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
};

interface Props { data: SeedData }

export function Executive({ data }: Props) {
  const t = useT();
  const { lang } = useLang();
  const isAr = lang === "ar";
  const [period, setPeriod] = useState("2026-04");

  const rollup = useMemo(
    () => computeOrgRollup(data.employees, data.workforceSnapshots, data.exitRecords, period),
    [data, period]
  );

  const trends = useMemo(
    () => computePeriodTrends(data.employees, data.workforceSnapshots, data.exitRecords, PERIODS),
    [data]
  );
  const foTrends = useMemo(
    () => computePeriodTrends(data.employees, data.workforceSnapshots, data.exitRecords, PERIODS, "front_office"),
    [data]
  );
  const hkTrends = useMemo(
    () => computePeriodTrends(data.employees, data.workforceSnapshots, data.exitRecords, PERIODS, "housekeeping"),
    [data]
  );

  const hiresExits = useMemo(() => PERIODS.map((p) => {
    const newHires = data.employees.filter((e) => e.hireDate.startsWith(p)).length;
    const exitCount = data.exitRecords.filter((ex) => ex.period === p).length;
    return {
      period: PERIOD_LABELS[p] ?? p,
      [isAr ? "مغادرة" : "Exits"]: exitCount,
      [isAr ? "تعيينات" : "Hires"]: newHires,
    };
  }), [data, isAr]);

  const saudiPct = Math.round(rollup.saudizationRate * 100);
  const nitaqatData = [
    { name: "Saudization", value: saudiPct, fill: nitaqatColor(rollup.nitaqatBand) },
  ];

  const deptBreakdown = useMemo(() => {
    const depts = [
      { id: "front_office", name: isAr ? "مكتب الاستقبال" : "Front Office" },
      { id: "housekeeping",  name: isAr ? "التدبير المنزلي" : "Housekeeping" },
    ];
    return depts.map((dept) => {
      const active = data.employees.filter((e) => e.departmentId === dept.id && e.employmentStatus === "Active");
      const snaps = data.workforceSnapshots.filter(
        (s) => s.period === period && active.some((e) => e.employeeId === s.employeeId)
      );
      const scores = snaps.map((s) => s.performanceRating).filter((v): v is number => v != null);
      return {
        dept: dept.name,
        avgKpi: scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0,
        headcount: active.length,
      };
    });
  }, [data, period, isAr]);

  return (
    <div className="space-y-6">
      {/* Period filter */}
      <div className="flex gap-3 items-center">
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="ctrl">
          {PERIODS.map((p) => <option key={p} value={p}>{PERIOD_LABELS[p]}</option>)}
        </select>
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>
          {isAr ? "فترة الإبلاغ" : "Reporting period"}
        </span>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label={t.headcount} value={rollup.headcount}
          sub={`${data.exitRecords.length} ${isAr ? "مغادرة" : "exits"}`} />
        <StatCard label={t.saudization} value={`${saudiPct}%`}
          sub={`${t.nitaqat}: ${rollup.nitaqatBand}`} accent={nitaqatColor(rollup.nitaqatBand)} />
        <StatCard label={t.femaleRep} value={`${Math.round(rollup.femaleRate * 100)}%`} accent={tokens.blue} />
        <StatCard label={t.attrition} value={`${Math.round(rollup.attritionRate * 100)}%`}
          sub={isAr ? "معدل الدوران" : "trailing window"}
          accent={rollup.attritionRate > 0.1 ? tokens.poor : tokens.exceptional} />
        <StatCard label={t.avgPerformance} value={rollup.avgPerformance ?? "—"} accent="var(--gold)" />
        <StatCard label={t.avgTraining} value={rollup.avgTrainingHours}
          sub={isAr ? "ساعة/موظف" : "hrs / employee"} />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartFrame title={t.kpiTrend} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trends} margin={{ left: -10 }}>
              <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
              <YAxis domain={[60, 100]} tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
              <Tooltip contentStyle={TT_STYLE} labelStyle={{ color: "var(--text)" }} />
              <Line type="monotone" dataKey="avgScore" stroke="var(--gold)" strokeWidth={2} dot={{ fill: "var(--gold)", r: 4 }} name={isAr ? "المتوسط الكلي" : "Org Avg"} />
              <Line type="monotone" dataKey="avgScore" data={foTrends} stroke={tokens.blue} strokeWidth={2} dot={{ fill: tokens.blue, r: 3 }} name={isAr ? "مكتب الاستقبال" : "Front Office"} />
              <Line type="monotone" dataKey="avgScore" data={hkTrends} stroke={tokens.exceptional} strokeWidth={2} dot={{ fill: tokens.exceptional, r: 3 }} name={isAr ? "التدبير المنزلي" : "Housekeeping"} />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{ background: "var(--gold)" }} />{isAr ? "المتوسط الكلي" : "Org Avg"}</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500 inline-block" />{isAr ? "مكتب الاستقبال" : "Front Office"}</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-green-600 inline-block" />{isAr ? "التدبير المنزلي" : "Housekeeping"}</span>
          </div>
        </ChartFrame>

        {/* Nitaqat gauge */}
        <ChartFrame title={`${t.nitaqat} — ${rollup.nitaqatBand}`}>
          <div className="flex flex-col items-center justify-center h-52">
            <ResponsiveContainer width="100%" height={160}>
              <RadialBarChart cx="50%" cy="80%" innerRadius="60%" outerRadius="90%"
                startAngle={180} endAngle={0} data={nitaqatData}>
                <RadialBar dataKey="value" background={{ fill: "var(--border)" }} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="text-center -mt-4">
              <div className="text-3xl font-bold" style={{ color: nitaqatColor(rollup.nitaqatBand) }}>
                {saudiPct}%
              </div>
              <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {isAr ? "نسبة السعودة" : "Saudization Rate"}
              </div>
              <div className="text-sm font-semibold mt-1" style={{ color: nitaqatColor(rollup.nitaqatBand) }}>
                {rollup.nitaqatBand}
              </div>
            </div>
          </div>
        </ChartFrame>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartFrame title={t.hiresVsExits}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hiresExits} margin={{ left: -10 }}>
              <XAxis dataKey="period" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
              <Tooltip contentStyle={TT_STYLE} />
              <Bar dataKey={isAr ? "تعيينات" : "Hires"} fill={tokens.exceptional} radius={[4, 4, 0, 0]} />
              <Bar dataKey={isAr ? "مغادرة" : "Exits"} fill={tokens.poor} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>

        <ChartFrame title={isAr ? "الأداء حسب القسم" : "Performance by Department"}>
          <div className="space-y-5 pt-2">
            {deptBreakdown.map((d) => (
              <div key={d.dept}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span style={{ color: "var(--text)" }}>{d.dept}</span>
                  <span className="font-bold" style={{ color: "var(--gold)" }}>{d.avgKpi}</span>
                </div>
                <div className="w-full rounded-full h-2" style={{ background: "var(--border)" }}>
                  <div className="h-2 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, d.avgKpi)}%`, background: "var(--gold)" }} />
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>
                  {d.headcount} {isAr ? "موظف" : "employees"}
                </div>
              </div>
            ))}
          </div>
        </ChartFrame>
      </div>
    </div>
  );
}
