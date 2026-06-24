import { useState, useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { LangContext, type Lang, type Theme } from "./context/LangContext";
import { useT } from "./i18n/useT";
import { WelcomeTour } from "./components/WelcomeTour";
import seedData from "./data/seed.json";
import type { SeedData } from "./domain/types";

const Executive = lazy(() => import("./dashboards/Executive").then((m) => ({ default: m.Executive })));
const HrManager = lazy(() => import("./dashboards/HrManager").then((m) => ({ default: m.HrManager })));
const DepartmentHead = lazy(() => import("./dashboards/DepartmentHead").then((m) => ({ default: m.DepartmentHead })));
const EmployeeSelf = lazy(() => import("./dashboards/EmployeeSelf").then((m) => ({ default: m.EmployeeSelf })));

const data = seedData as SeedData;

type Role = "executive" | "hr" | "dept_head" | "employee";

const ROLES: { id: Role; path: string }[] = [
  { id: "executive",  path: "/executive" },
  { id: "hr",         path: "/hr-manager" },
  { id: "dept_head",  path: "/dept-head" },
  { id: "employee",   path: "/employee" },
];

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

function NavBar({ lang, setLang, theme, setTheme, onHelp }: {
  lang: Lang; setLang: (l: Lang) => void;
  theme: Theme; setTheme: (t: Theme) => void;
  onHelp: () => void;
}) {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();

  const roleLabels: Record<Role, string> = {
    executive: t.roleExec,
    hr: t.roleHR,
    dept_head: t.roleDeptHead,
    employee: t.roleEmployee,
  };

  const currentPath = location.pathname;
  const isLight = theme === "light";

  return (
    <header
      className="sticky top-0 z-50 surface-transition"
      style={{
        backgroundColor: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Demo banner */}
      <div
        className="text-center text-xs py-1 font-medium tracking-wide"
        style={{ backgroundColor: "var(--gold-bg)", color: "var(--gold)", borderBottom: "1px solid var(--border-gold)" }}
      >
        ⚠ {t.demoBanner}
      </div>

      <div className="max-w-screen-xl mx-auto px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
        {/* Brand — portfolio-style serif */}
        <div className="flex items-center gap-3">
          <div
            className="font-display text-xl font-semibold tracking-tight"
            style={{ color: "var(--text)" }}
          >
            Hotel<span style={{ color: "var(--gold)" }}>Pulse</span>
            <span style={{ color: "var(--gold)" }}>.</span>
          </div>
          <div
            className="hidden sm:block text-xs uppercase tracking-widest"
            style={{ color: "var(--text-muted)" }}
          >
            {t.hotelName}
          </div>
        </div>

        {/* Role tabs */}
        <nav className="flex gap-1 flex-wrap">
          {ROLES.map(({ id, path }) => {
            const pathKey = path.slice(1);
            const active = currentPath.includes(pathKey);
            return (
              <button
                key={id}
                onClick={() => navigate(path)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all duration-150"
                style={active ? {
                  backgroundColor: "var(--gold)",
                  color: isLight ? "#FFFFFF" : "#0F172A",
                  boxShadow: "0 2px 8px rgba(201,162,39,0.35)",
                } : {
                  backgroundColor: "transparent",
                  color: "var(--text-muted)",
                  border: "1px solid var(--border)",
                }}
              >
                {roleLabels[id]}
              </button>
            );
          })}
        </nav>

        {/* Controls: lang + theme */}
        <div className="flex items-center gap-2">
          {/* Language */}
          <button
            onClick={() => setLang(lang === "en" ? "ar" : "en")}
            className="ctrl text-xs font-medium uppercase tracking-wide"
            style={{ color: "var(--text-muted)" }}
          >
            {lang === "en" ? "🇸🇦 AR" : "🇬🇧 EN"}
          </button>

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="ctrl flex items-center gap-1.5"
            style={{ color: "var(--text-muted)" }}
            title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          >
            {theme === "light" ? <MoonIcon /> : <SunIcon />}
            <span className="text-xs font-medium">{theme === "light" ? "Dark" : "Light"}</span>
          </button>

          {/* Help / tour */}
          <button
            onClick={onHelp}
            className="ctrl flex items-center justify-center font-bold text-sm"
            style={{ color: "var(--gold)", border: "1px solid var(--gold)", borderRadius: 6, width: 28, height: 28 }}
            title="How it works"
          >?</button>
        </div>
      </div>
    </header>
  );
}

function AppInner() {
  const [lang, setLang] = useState<Lang>("en");
  const [theme, setTheme] = useState<Theme>("light");
  const [showTour, setShowTour] = useState(
    () => localStorage.getItem("hp-tour-seen") !== "1"
  );

  // Apply theme to document root
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const closeTour = () => {
    localStorage.setItem("hp-tour-seen", "1");
    setShowTour(false);
  };

  const fontFamily = lang === "ar"
    ? "'Noto Kufi Arabic', sans-serif"
    : "'Inter', sans-serif";

  return (
    <LangContext.Provider value={{ lang, setLang, theme, setTheme }}>
      <div
        className="min-h-screen surface-transition"
        dir={lang === "ar" ? "rtl" : "ltr"}
        style={{ backgroundColor: "var(--bg)", color: "var(--text)", fontFamily }}
      >
        <NavBar lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} onHelp={() => setShowTour(true)} />
        <main className="max-w-screen-xl mx-auto px-4 py-6">
          <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading…</div>}>
            <Routes>
              <Route path="/" element={<Navigate to="/executive" replace />} />
              <Route path="/executive" element={<Executive data={data} />} />
              <Route path="/hr-manager" element={<HrManager data={data} />} />
              <Route path="/dept-head"  element={<DepartmentHead data={data} />} />
              <Route path="/employee"   element={<EmployeeSelf data={data} />} />
            </Routes>
          </Suspense>
        </main>
        {showTour && <WelcomeTour onClose={closeTour} />}
      </div>
    </LangContext.Provider>
  );
}

export default function App() {
  return (
    <BrowserRouter
      basename="/hr"
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <AppInner />
    </BrowserRouter>
  );
}
