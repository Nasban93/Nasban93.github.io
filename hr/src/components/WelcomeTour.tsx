import { useState } from "react";
import { useLang } from "../i18n/useT";

interface Props {
  onClose: () => void;
}

const TABS_EN = [
  {
    id: "overview",
    label: "Overview",
    icon: "🏨",
    title: "What is HotelPulse?",
    body: `HotelPulse is an HR performance dashboard built for Najd Crown Hotel & Residences — a Saudi hospitality property with ~63 staff across two departments.

It demonstrates how a hotel can track KPIs, monitor Saudization compliance, manage coaching queues, and give every employee a view of their own performance.`,
    bullets: [
      "Synthetic demo data — no real employees or PII",
      "4 role-based views, each showing a different lens",
      "Bilingual: switch EN ↔ AR with the language button",
      "Dark mode available via the moon icon",
    ],
  },
  {
    id: "executive",
    label: "Executive",
    icon: "📊",
    title: "Executive View",
    body: `High-level org snapshot for senior leadership. Covers the headline numbers that matter at the hotel level.`,
    bullets: [
      "Headcount broken down by Direct vs Casual (vendor) staff",
      "Saudization rate — counts direct hotel payroll only, excluding vendor staff (Nitaqat compliance)",
      "Female representation, attrition rate, avg KPI, avg training hours",
      "Hires vs exits trend chart and 6-month KPI trend",
      "Workforce Composition panel shows vendor breakdown",
    ],
  },
  {
    id: "hr",
    label: "HR Manager",
    icon: "👥",
    title: "HR Manager View",
    body: `Full workforce analytics with filtering. Designed for the HR team to monitor performance across all staff.`,
    bullets: [
      "Filter by period, staff type (All / Direct / Casual)",
      "Grade distribution pie chart and KPI trend over 6 months",
      "Coaching Queue — employees below the 75% threshold, sorted by score",
      "Full Employee Table — search and sort all 63 staff, click any name to open their full profile",
      "Vendor breakdown table shows performance by third-party staffing company",
    ],
  },
  {
    id: "dept",
    label: "Dept Head",
    icon: "🏷️",
    title: "Department Head View",
    body: `Drill into one department at a time. Designed for Front Office and Housekeeping managers.`,
    bullets: [
      "Switch between Front Office and Housekeeping",
      "Stacked KPI bar chart shows each employee's score breakdown by KPI",
      "Team Ranking table lists every employee with individual KPI scores — click a name for their full profile",
      "Coaching Queue cards show the weakest KPI and a suggested improvement plan per employee",
      "Filter by Direct / Casual staff or search by name",
    ],
  },
  {
    id: "employee",
    label: "Employee",
    icon: "👤",
    title: "Employee Self-Service",
    body: `Each employee can see their own data — no access to colleagues' scores. Select any employee from the dropdown to explore.`,
    bullets: [
      "6-month KPI trend line with the coaching threshold marked",
      "Radar chart comparing personal KPIs vs team average",
      "KPI breakdown bar showing score on each metric",
      "If below threshold, a personalised Improvement Plan is generated for the weakest KPI",
    ],
  },
  {
    id: "profile",
    label: "Profile",
    icon: "🗂️",
    title: "Employee Profile Modal",
    body: `Click any employee name (in HR Manager or Dept Head tables) to open a full profile panel.`,
    bullets: [
      "Profile info: department, job level, grade band, salary, tenure, nationality, hire date",
      "6-month performance trend chart",
      "Full KPI History table — all KPIs × all 6 periods, color-coded (orange = below 75%)",
      "Workforce Snapshots — training hours and performance rating per period",
      "Improvement Plan shown if the employee is in the coaching queue",
    ],
  },
];

const TABS_AR = [
  {
    id: "overview",
    label: "نظرة عامة",
    icon: "🏨",
    title: "ما هو HotelPulse؟",
    body: `HotelPulse لوحة تحكم لأداء الموارد البشرية مبنية لفندق نجد كراون — فندق سعودي يضم ~63 موظفاً في قسمين.

يوضح النظام كيف يمكن للفندق متابعة مؤشرات الأداء والامتثال للسعودة وإدارة قوائم التدريب ومنح كل موظف إمكانية الاطلاع على أدائه.`,
    bullets: [
      "بيانات تجريبية مصطنعة — لا توجد بيانات موظفين حقيقية",
      "4 واجهات حسب الدور الوظيفي",
      "ثنائي اللغة: تبديل بين العربية والإنجليزية",
      "وضع الظلام متاح عبر أيقونة القمر",
    ],
  },
  {
    id: "executive",
    label: "التنفيذي",
    icon: "📊",
    title: "واجهة التنفيذيين",
    body: `لمحة على مستوى المؤسسة للقيادة العليا.`,
    bullets: [
      "إجمالي الموظفين: مباشرون وشركات",
      "نسبة السعودة — تحتسب الموظفين المباشرين فقط (نطاقات)",
      "نسبة المرأة، معدل الاستنزاف، متوسط الأداء، ساعات التدريب",
      "مخطط التوظيف مقابل المغادرة واتجاه المؤشرات خلال 6 أشهر",
    ],
  },
  {
    id: "hr",
    label: "مدير الموارد البشرية",
    icon: "👥",
    title: "واجهة مدير الموارد البشرية",
    body: `تحليل شامل للقوى العاملة مع إمكانية التصفية.`,
    bullets: [
      "تصفية حسب الفترة ونوع التوظيف",
      "توزيع التقييمات واتجاه المؤشرات",
      "قائمة الدعم — موظفون أقل من 75%",
      "جدول الموظفين الكامل — انقر على أي اسم لفتح الملف الكامل",
    ],
  },
  {
    id: "dept",
    label: "رئيس القسم",
    icon: "🏷️",
    title: "واجهة رئيس القسم",
    body: `تفاصيل لكل قسم على حدة.`,
    bullets: [
      "التبديل بين مكتب الاستقبال والتدبير المنزلي",
      "مخطط المؤشرات المكدسة لكل موظف",
      "جدول ترتيب الفريق مع درجات المؤشرات الفردية",
      "بطاقات قائمة الدعم مع خطة تحسين لكل موظف",
    ],
  },
  {
    id: "employee",
    label: "الموظف",
    icon: "👤",
    title: "الخدمة الذاتية للموظف",
    body: `يرى كل موظف بياناته الخاصة فقط.`,
    bullets: [
      "اتجاه المؤشر خلال 6 أشهر مع خط الحد",
      "مخطط راداري للمقارنة مع متوسط الفريق",
      "تفاصيل كل مؤشر على حدة",
      "خطة تحسين مخصصة عند الانخفاض عن الحد",
    ],
  },
  {
    id: "profile",
    label: "الملف الشخصي",
    icon: "🗂️",
    title: "لوحة الملف الشخصي للموظف",
    body: `انقر على أي اسم موظف في جداول مدير الموارد البشرية أو رئيس القسم لفتح لوحة الملف.`,
    bullets: [
      "معلومات الموظف: القسم، المسمى، نطاق الراتب، الأقدمية",
      "مخطط اتجاه الأداء لـ6 أشهر",
      "جدول سجل المؤشرات الكامل مع ترميز لوني",
      "ملقطات القوى العاملة: ساعات التدريب والتقييم",
    ],
  },
];

export function WelcomeTour({ onClose }: Props) {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const tabs = isAr ? TABS_AR : TABS_EN;
  const [activeTab, setActiveTab] = useState(0);

  const tab = tabs[activeTab]!;
  const isLast = activeTab === tabs.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full flex flex-col"
        style={{
          maxWidth: 620,
          maxHeight: "90vh",
          background: "var(--bg)",
          borderRadius: 16,
          border: "1px solid var(--border)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="font-display text-xl font-semibold" style={{ color: "var(--text)" }}>
              Hotel<span style={{ color: "var(--gold)" }}>Pulse</span>
              <span className="ml-2 text-sm font-normal" style={{ color: "var(--text-muted)" }}>
                — {isAr ? "دليل الاستخدام" : "How It Works"}
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-xl font-light"
              style={{ color: "var(--text-muted)", lineHeight: 1 }}
            >✕</button>
          </div>
          {/* Tab bar */}
          <div className="flex gap-1 flex-wrap">
            {tabs.map((t, i) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(i)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
                style={activeTab === i ? {
                  backgroundColor: "var(--gold)",
                  color: "#fff",
                } : {
                  backgroundColor: "var(--surface)",
                  color: "var(--text-muted)",
                  border: "1px solid var(--border)",
                }}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto flex-1">
          <div className="text-3xl mb-2">{tab.icon}</div>
          <h2 className="text-lg font-bold mb-3" style={{ color: "var(--text)" }}>{tab.title}</h2>
          <p className="text-sm leading-relaxed mb-4 whitespace-pre-line" style={{ color: "var(--text-muted)" }}>
            {tab.body}
          </p>
          <ul className="space-y-2">
            {tab.bullets.map((b, i) => (
              <li key={i} className="flex gap-2 text-sm" style={{ color: "var(--text)" }}>
                <span style={{ color: "var(--gold)", flexShrink: 0 }}>▸</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-between"
          style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
          <div className="flex gap-2">
            {tabs.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className="rounded-full transition-all"
                style={{
                  width: i === activeTab ? 20 : 8,
                  height: 8,
                  backgroundColor: i === activeTab ? "var(--gold)" : "var(--border)",
                }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {activeTab > 0 && (
              <button
                onClick={() => setActiveTab(activeTab - 1)}
                className="ctrl text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                {isAr ? "→ السابق" : "← Back"}
              </button>
            )}
            {!isLast ? (
              <button
                onClick={() => setActiveTab(activeTab + 1)}
                className="px-4 py-1.5 rounded-lg text-sm font-semibold"
                style={{ backgroundColor: "var(--gold)", color: "#fff" }}
              >
                {isAr ? "التالي ←" : "Next →"}
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg text-sm font-semibold"
                style={{ backgroundColor: "var(--gold)", color: "#fff" }}
              >
                {isAr ? "ابدأ الاستخدام ✓" : "Got it — Let's go ✓"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
