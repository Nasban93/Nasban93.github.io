"""
HotelPulse v5.1 — Front Office Performance Management System (Portfolio Edition)
"""

import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
import pandas as pd
import numpy as np
import sqlite3
from datetime import datetime

st.set_page_config(page_title="HotelPulse — Performance Management System", page_icon="📊", layout="wide")

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Kufi+Arabic:wght@400;600;700&display=swap');
.hp-hd { padding:0.8rem 0; border-bottom:2px solid #2563EB; margin-bottom:1rem; display:flex; align-items:center; justify-content:space-between; }
.hp-hd h1 { font-family:'Inter',sans-serif; font-size:1.3rem; margin:0; font-weight:700; }
.hp-hd span { font-size:0.7rem; letter-spacing:0.1em; text-transform:uppercase; opacity: 0.7; }
.kc { border:1px solid rgba(128,128,128,0.2); border-radius:8px; padding:1rem; text-align:center; }
.kc .lbl { font-family:'Inter',sans-serif; font-size:0.65rem; text-transform:uppercase; letter-spacing:0.08em; opacity: 0.8; }
.kc .val { font-family:'Inter',sans-serif; font-size:1.5rem; font-weight:700; margin:0.1rem 0; }
.kc .sub { font-size:0.75rem; opacity: 0.6; }
.guide-box { border:1px solid rgba(128,128,128,0.2); border-radius:10px; padding:1.5rem; margin:0.8rem 0; }
.guide-box h4 { margin:0 0 0.5rem; font-size:1rem; }
.guide-box p { font-size:0.88rem; line-height:1.6; margin:0; opacity: 0.9; }
.benefit { background:rgba(37,99,235,0.1); border-left:3px solid #2563EB; padding:0.8rem 1rem; border-radius:0 8px 8px 0; margin:0.5rem 0; }
.benefit strong { color:#2563EB; font-size:0.85rem; }
.benefit p { font-size:0.82rem; margin:0.2rem 0 0; line-height:1.5; opacity: 0.9; }
.ar { font-family:'Noto Kufi Arabic',sans-serif; direction:rtl; text-align:right; font-size:0.85rem; line-height:1.8; margin:0.3rem 0; opacity: 0.9; }
.warn-banner { background:rgba(245,158,11,0.15); border:1px solid #F59E0B; border-radius:8px; padding:0.8rem 1rem; margin:1rem 0; border-left: 4px solid #F59E0B; }
.warn-banner p { font-size:0.85rem; margin:0; color: #92400E; }
html[data-theme="dark"] .warn-banner p { color: #FCD34D; }
.score-badge { display:inline-block; padding:0.15rem 0.6rem; border-radius:12px; font-weight:600; font-size:0.78rem; }
.kpi-selector { border:1px solid rgba(128,128,128,0.2); border-radius:10px; padding:0.5rem 1rem; margin-bottom:1rem; }
#MainMenu,footer {visibility:hidden;}
.rtl-container { direction: rtl; text-align: right; font-family: 'Noto Kufi Arabic', sans-serif; }
.dev-card { margin-top: 3rem; padding: 1.2rem; background-color: rgba(37,99,235,0.05); border: 1px solid rgba(37,99,235,0.2); border-radius: 8px; text-align: center; line-height: 1.6; }
.dev-card strong { font-size: 0.95rem; color: #1E293B; display:block; margin-bottom: 0.4rem; font-weight: 700; }
.dev-card a { color: #2563EB; text-decoration: none; font-size: 0.85rem; display:block; margin-top:0.2rem; font-weight: 600; }
.dev-card a:hover { text-decoration: underline; }
html[data-theme="dark"] .dev-card strong { color: #F8FAFC; }
html[data-theme="dark"] .dev-card a { color: #60A5FA; }
</style>
""", unsafe_allow_html=True)

ANS_EN = {"Yes": 1.0, "Partially": 0.5, "No": 0.0, "N/A": None}
ANS_AR = {"نعم": 1.0, "جزئياً": 0.5, "لا": 0.0, "لا ينطبق": None}

DB = "hotelpulse_data.db"

def get_db():
    conn = sqlite3.connect(DB); conn.execute("PRAGMA journal_mode=WAL"); return conn

def init_db():
    c = get_db()
    c.executescript("""
    CREATE TABLE IF NOT EXISTS agents (
        emp_id TEXT PRIMARY KEY, name TEXT NOT NULL, position TEXT DEFAULT 'Agent',
        active INTEGER DEFAULT 1, is_sample INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS guest_feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT, emp_id TEXT NOT NULL, month TEXT NOT NULL,
        call_type TEXT NOT NULL, guest_name TEXT DEFAULT '', room TEXT DEFAULT '',
        vip_tier TEXT DEFAULT '', q1 TEXT, q2 TEXT, q3 TEXT, q4 TEXT, q5 TEXT,
        overall_rating INTEGER DEFAULT 3, comments TEXT DEFAULT '',
        score REAL NOT NULL, caller TEXT DEFAULT '',
        is_sample INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS supervisor_eval (
        id INTEGER PRIMARY KEY AUTOINCREMENT, emp_id TEXT NOT NULL, month TEXT NOT NULL,
        q1 TEXT, q2 TEXT, q3 TEXT, q4 TEXT, q5 TEXT,
        overall_rating INTEGER DEFAULT 3, bonus_task TEXT DEFAULT 'No',
        kpi REAL NOT NULL, evaluator TEXT DEFAULT '', notes TEXT DEFAULT '',
        is_sample INTEGER DEFAULT 0, UNIQUE(emp_id, month));
    CREATE TABLE IF NOT EXISTS attendance (
        emp_id TEXT NOT NULL, month TEXT NOT NULL, days_present INTEGER DEFAULT 0,
        days_absent INTEGER DEFAULT 0, late_count INTEGER DEFAULT 0,
        late_minutes INTEGER DEFAULT 0, score REAL, is_sample INTEGER DEFAULT 0,
        PRIMARY KEY(emp_id, month));
    CREATE TABLE IF NOT EXISTS upselling (
        emp_id TEXT NOT NULL, month TEXT NOT NULL, target REAL DEFAULT 0,
        actual REAL DEFAULT 0, count INTEGER DEFAULT 0, score REAL,
        is_sample INTEGER DEFAULT 0, PRIMARY KEY(emp_id, month));
    CREATE TABLE IF NOT EXISTS enrollments (
        emp_id TEXT NOT NULL, month TEXT NOT NULL, target INTEGER DEFAULT 0,
        actual INTEGER DEFAULT 0, score REAL, is_sample INTEGER DEFAULT 0,
        PRIMARY KEY(emp_id, month));
    CREATE TABLE IF NOT EXISTS production (
        emp_id TEXT NOT NULL, month TEXT NOT NULL, checkins INTEGER DEFAULT 0,
        checkouts INTEGER DEFAULT 0, transactions INTEGER DEFAULT 0, score REAL,
        is_sample INTEGER DEFAULT 0, PRIMARY KEY(emp_id, month));
    CREATE TABLE IF NOT EXISTS action_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT, emp_id TEXT NOT NULL, month TEXT NOT NULL,
        lowest_kpi TEXT, plan_text TEXT, created_by TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    """)
    c.close()

def has_sample():
    conn = get_db(); n = conn.execute("SELECT COUNT(*) FROM agents WHERE is_sample=1").fetchone()[0]; conn.close(); return n > 0

def load_sample():
    conn = get_db()
    if has_sample(): conn.close(); return
    agents = [("S001","Agent 01","Senior Agent"),("S002","Agent 02","Agent"),
        ("S003","Agent 03","Agent"),("S004","Agent 04","Night Agent"),
        ("S005","Agent 05","Senior Agent"),("S006","Agent 06","Agent"),
        ("S007","Agent 07","Agent"),("S008","Agent 08","Senior Agent"),
        ("S009","Agent 09","Night Agent"),("S010","Agent 10","Agent"),
        ("S011","Agent 11","Agent"),("S012","Agent 12","Agent"),
        ("S013","Agent 13","Senior Agent"),("S014","Agent 14","Agent"),
        ("S015","Agent 15","Night Agent"),("S016","Agent 16","Agent"),
        ("S017","Agent 17","Agent"),("S018","Agent 18","Senior Agent")]
    for eid, name, pos in agents:
        conn.execute("INSERT OR IGNORE INTO agents (emp_id,name,position,is_sample) VALUES (?,?,?,1)", (eid, name, pos))
    np.random.seed(42); month = "SAMPLE"
    for eid, _, _ in agents:
        for _ in range(np.random.randint(3, 7)):
            conn.execute("INSERT INTO guest_feedback (emp_id,month,call_type,guest_name,score,caller,is_sample) VALUES (?,?,?,?,?,?,1)",
                (eid, month, "Check-In", f"Guest {np.random.randint(100,999)}", round(np.random.uniform(75,100),2), "GR Team"))
        for _ in range(np.random.randint(3, 7)):
            conn.execute("INSERT INTO guest_feedback (emp_id,month,call_type,guest_name,score,caller,is_sample) VALUES (?,?,?,?,?,?,1)",
                (eid, month, "Check-Out", f"Guest {np.random.randint(100,999)}", round(np.random.uniform(80,100),2), "GR Team"))
        conn.execute("INSERT OR REPLACE INTO supervisor_eval (emp_id,month,kpi,evaluator,is_sample) VALUES (?,?,?,?,1)",
            (eid, month, round(np.random.uniform(74,110),1), "Sample Evaluator"))
        present = np.random.randint(22, 27); absent = 26 - present
        lates = np.random.randint(0, 4); late_mins = lates * np.random.randint(5, 18)
        conn.execute("INSERT OR REPLACE INTO attendance VALUES (?,?,?,?,?,?,?,1)",
            (eid, month, present, absent, lates, late_mins, max(0, round(100-(absent*8)-(late_mins*0.3),1))))
        tgt = float(np.random.choice([5000,8000,10000])); act = round(tgt * np.random.uniform(0.6,1.3))
        conn.execute("INSERT OR REPLACE INTO upselling VALUES (?,?,?,?,?,?,1)",
            (eid, month, tgt, act, int(np.random.randint(3,15)), round(min(100,(act/tgt)*100),1)))
        te = int(np.random.choice([8,10,12])); ae = int(np.random.randint(4,16))
        conn.execute("INSERT OR REPLACE INTO enrollments VALUES (?,?,?,?,?,1)",
            (eid, month, te, ae, round(min(120,(ae/te)*100),1)))
        ci=int(np.random.randint(40,120)); co=int(np.random.randint(30,100)); tr=int(np.random.randint(50,200))
        conn.execute("INSERT OR REPLACE INTO production VALUES (?,?,?,?,?,?,1)",
            (eid, month, ci, co, tr, round(min(100,(ci+co+tr)/4.0),1)))
    conn.commit(); conn.close()

def clear_sample():
    conn = get_db()
    for tb in ["guest_feedback","supervisor_eval","attendance","upselling","enrollments","production"]:
        conn.execute(f"DELETE FROM {tb} WHERE is_sample=1")
    conn.execute("DELETE FROM agents WHERE is_sample=1"); conn.commit(); conn.close()

# ── SCORING ──
def calc_guest_score(answers, overall, is_ar):
    ans_map = ANS_AR if is_ar else ANS_EN
    pts = 0; mx = 0
    for a in answers:
        v = ans_map.get(a)
        if v is not None: pts += v * 20; mx += 20
    pts += (overall / 5) * 20; mx += 20
    return round((pts / max(mx, 1)) * 100, 2)

def calc_sup_kpi(answers, overall, bonus, is_ar):
    pts = 0
    yes_val = "نعم" if is_ar else "Yes"
    part_val = "جزئياً" if is_ar else "Partially"
    for a in answers:
        if a == yes_val: pts += 16
        elif a == part_val: pts += 8
    pts += (overall / 5) * 20
    if bonus == yes_val: pts += 10
    return round(min(110, pts), 1)

WEIGHTS = {"Guest Experience": 0.20, "Supervisor": 0.15, "Attendance": 0.20,
           "Upselling": 0.15, "Enrollments": 0.15, "Production": 0.15}

def grade(s, is_ar):
    if s >= 93: return "متميز" if is_ar else "Exceptional", "sb-green"
    if s >= 85: return "ممتاز" if is_ar else "Excellent", "sb-blue"
    if s >= 75: return "جيد" if is_ar else "Good", "sb-yellow"
    if s >= 60: return "مقبول" if is_ar else "Fair", "sb-orange"
    return "يحتاج تطوير" if is_ar else "Needs Improvement", "sb-red"

def calc_kpis(conn, month, inc_sample=False, is_ar=False):
    sf = "" if inc_sample else "AND is_sample=0"
    af = "WHERE active=1" if inc_sample else "WHERE active=1 AND is_sample=0"
    agents = pd.read_sql(f"SELECT emp_id, name, position FROM agents {af} ORDER BY emp_id", conn)
    if len(agents) == 0: return pd.DataFrame()
    rows = []
    for _, ag in agents.iterrows():
        eid = ag["emp_id"]
        ci_c = pd.read_sql(f"SELECT score FROM guest_feedback WHERE emp_id=? AND month=? AND call_type='Check-In' {sf}", conn, params=(eid, month))
        co_c = pd.read_sql(f"SELECT score FROM guest_feedback WHERE emp_id=? AND month=? AND call_type='Check-Out' {sf}", conn, params=(eid, month))
        ci_a = float(ci_c["score"].astype(float).mean()) if len(ci_c) > 0 else None
        co_a = float(co_c["score"].astype(float).mean()) if len(co_c) > 0 else None
        if ci_a is not None and co_a is not None: gk = round((ci_a + co_a) / 2, 2)
        elif ci_a is not None: gk = round(ci_a, 2)
        elif co_a is not None: gk = round(co_a, 2)
        else: gk = None
        sup = pd.read_sql(f"SELECT kpi FROM supervisor_eval WHERE emp_id=? AND month=? {sf}", conn, params=(eid, month))
        sk = float(sup["kpi"].iloc[0]) if len(sup) > 0 else None
        att = pd.read_sql(f"SELECT score FROM attendance WHERE emp_id=? AND month=? {sf}", conn, params=(eid, month))
        ak = float(att["score"].iloc[0]) if len(att) > 0 else None
        ups = pd.read_sql(f"SELECT score FROM upselling WHERE emp_id=? AND month=? {sf}", conn, params=(eid, month))
        uk = float(ups["score"].iloc[0]) if len(ups) > 0 else None
        enr = pd.read_sql(f"SELECT score FROM enrollments WHERE emp_id=? AND month=? {sf}", conn, params=(eid, month))
        ek = float(enr["score"].iloc[0]) if len(enr) > 0 else None
        prod = pd.read_sql(f"SELECT score FROM production WHERE emp_id=? AND month=? {sf}", conn, params=(eid, month))
        pk = float(prod["score"].iloc[0]) if len(prod) > 0 else None
        sc = {"Guest Experience": gk, "Supervisor": sk, "Attendance": ak, "Upselling": uk, "Enrollments": ek, "Production": pk}
        t = 0; ws = 0
        for k, v in sc.items():
            if v is not None: t += v * WEIGHTS[k]; ws += WEIGHTS[k]
        final = round(t / ws, 1) if ws > 0 else 0
        g, gc = grade(final, is_ar)
        
        # Determine column names based on language
        k_ge = "تجربة الضيف (20%)" if is_ar else "Guest Experience (20%)"
        k_su = "المشرف (15%)" if is_ar else "Supervisor (15%)"
        k_at = "الحضور (20%)" if is_ar else "Attendance (20%)"
        k_up = "المبيعات (15%)" if is_ar else "Upselling (15%)"
        k_en = "الولاء (15%)" if is_ar else "Enrollments (15%)"
        k_pr = "الإنتاجية (15%)" if is_ar else "Production (15%)"
        
        row_dict = {
            "الرقم الوظيفي" if is_ar else "Emp ID": eid, 
            "الاسم" if is_ar else "Name": ag["name"], 
            "دخول" if is_ar else "Check-In": round(ci_a, 2) if ci_a else None, 
            "خروج" if is_ar else "Check-Out": round(co_a, 2) if co_a else None,
            k_ge: gk, k_su: sk, k_at: ak, k_up: uk, k_en: ek, k_pr: pk,
            "النتيجة النهائية" if is_ar else "Total KPI": final, 
            "التقييم" if is_ar else "Grade": g
        }
        rows.append(row_dict)
    df = pd.DataFrame(rows)
    if len(df) > 0: 
        sort_col = "النتيجة النهائية" if is_ar else "Total KPI"
        df = df.sort_values(sort_col, ascending=False).reset_index(drop=True)
    return df

PIP_PRESETS_EN = {
    "Guest Experience": "1. Review guest experience scoring rubric with GR Team.\n2. Shadow a top-scorer for 3 guest interactions.\n3. Practice greeting scripts with supervisor.",
    "Supervisor": "1. Weekly 15-min one-on-one with supervisor.\n2. Review SOPs for the 3 most common procedures.\n3. Attend one cross-training session.",
    "Attendance": "1. Review attendance policy with HR.\n2. Set up personal reminder for shift start.\n3. Discuss barriers with supervisor.",
    "Upselling": "1. Review room category matrix and rate differences.\n2. Shadow the top up-seller for 2 shifts.\n3. Practice 3 upselling scripts.",
    "Enrollments": "1. Review loyalty program benefits and talking points.\n2. Practice the 30-second enrollment pitch.\n3. Target 1 enrollment per shift.",
    "Production": "1. Review Opera shortcuts for faster processing.\n2. Observe a high-producer for a full shift.\n3. Practice handling 3 simultaneous tasks."
}

PIP_PRESETS_AR = {
    "Guest Experience": "1. مراجعة معايير تقييم الضيوف.\n2. مرافقة موظف متميز لـ 3 تفاعلات.\n3. التدريب على نصوص الترحيب.",
    "Supervisor": "1. اجتماع أسبوعي 15 دقيقة مع المشرف.\n2. مراجعة الإجراءات الأساسية.\n3. حضور جلسة تدريب متقاطع.",
    "Attendance": "1. مراجعة سياسة الحضور مع الموارد البشرية.\n2. إعداد منبهات شخصية لبداية الوردية.\n3. مناقشة العوائق مع المشرف.",
    "Upselling": "1. مراجعة فئات الغرف وفروقات الأسعار.\n2. مرافقة أفضل بائع لورديتين.\n3. التدريب على 3 نصوص بيعية.",
    "Enrollments": "1. مراجعة فوائد برنامج الولاء.\n2. التدريب على عرض التسجيل في 30 ثانية.\n3. استهداف تسجيل واحد لكل وردية.",
    "Production": "1. مراجعة اختصارات النظام لتسريع العمل.\n2. مراقبة موظف عالي الإنتاجية.\n3. التدريب على إدارة طوابير الانتظار."
}

# ── INIT ──
init_db(); load_sample()

# ── HELPERS ──
def get_real_agents():
    conn = get_db()
    adf = pd.read_sql("SELECT emp_id, name FROM agents WHERE active=1 AND is_sample=0 ORDER BY name", conn)
    conn.close(); return adf

def agent_opts(adf, is_ar):
    if len(adf) == 0: return ["— لا يوجد موظفين —" if is_ar else "— No agents —"]
    return [f"{r['emp_id']} — {r['name']}" for _, r in adf.iterrows()]

# ── SIDEBAR ──
with st.sidebar:
    lang = st.radio("🌐 Language / اللغة", ["English", "العربية"], horizontal=True)
    is_ar = lang == "العربية"
    st.divider()
    
    hotel_name = st.text_input("الفندق" if is_ar else "Property", value="", placeholder="اسم الفندق" if is_ar else "Hotel Name")
    st.divider()
    
    months = ["SAMPLE","April 2026","March 2026","February 2026","January 2026","December 2025","November 2025"]
    sel_month = st.selectbox("الشهر" if is_ar else "Month", months)
    st.divider()
    
    if has_sample():
        st.caption("البيانات الحالية تجريبية" if is_ar else "Sample data loaded")
        if st.button("حذف التجريبية" if is_ar else "Remove Sample", use_container_width=True): clear_sample(); st.rerun()
    else:
        if st.button("تحميل بيانات تجريبية" if is_ar else "Load Sample Data", use_container_width=True): load_sample(); st.rerun()
    st.divider()
    
    conn = get_db()
    n_real = conn.execute("SELECT COUNT(*) FROM agents WHERE active=1 AND is_sample=0").fetchone()[0]
    conn.close()
    st.metric("موظفينك" if is_ar else "Your Agents", n_real)
    
    # Highly Visible Developer Contact Card
    dev_title = "تم التطوير بواسطة<br>خالد بن نصبان" if is_ar else "Developed by<br>Khalid Bin Nasban"
    st.markdown(f"""
    <div class="dev-card">
        <strong>{dev_title}</strong>
        <a href="mailto:KNasban@gmail.com">✉️ KNasban@gmail.com</a>
        <a href="https://www.linkedin.com/in/khalid-nasban" target="_blank">🔗 LinkedIn Profile</a>
    </div>
    """, unsafe_allow_html=True)

dn = hotel_name if hotel_name.strip() else ("الفندق الخاص بك" if is_ar else "Your Property")
title_text = "نظام إدارة أداء مكتب الاستقبال" if is_ar else "Front Office Performance Management System"
st.markdown(f'<div class="hp-hd"><h1>HotelPulse — {title_text}</h1><span>{dn}</span></div>', unsafe_allow_html=True)

NO_AGENTS_MSG = "لا يوجد موظفين. أضف فريقك في تبويب الموظفين." if is_ar else "No agents registered. Forms are disabled. Add your team in the Agents & Import tab."

# ═══════════════════════════════════════
# 5 TABS
# ═══════════════════════════════════════
tabs_list = ["📖 الدليل", "📊 لوحة المعلومات", "📝 إدخال الأداء", "👥 الموظفين والاستيراد", "🎯 التطوير"] if is_ar else ["📖 Guide", "📊 Dashboard", "📝 Performance Input", "👥 Agents & Import", "🎯 Coaching"]
tab_guide, tab_dash, tab_perf, tab_agents, tab_coach = st.tabs(tabs_list)

# ═══════════════════════════════════════
# GUIDE
# ═══════════════════════════════════════
with tab_guide:
    if is_ar:
        st.markdown('<div class="rtl-container">', unsafe_allow_html=True)
        st.markdown("## مرحبا بك في نظام HotelPulse")
        st.markdown("نظام مصمم لعمليات مكتب الاستقبال لقياس أداء كل موظف بناء على ستة مؤشرات أداء مرتبطة بأهداف الفندق.")
        st.markdown("---")
        
        st.markdown("### طريقة استخدام النظام")
        st.markdown("""
        1. **👥 الموظفين:** أضف أعضاء فريق عملك من تبويب 'الموظفين والاستيراد'.
        2. **📝 إدخال الأداء:** أدخل درجات مؤشرات الأداء الشهرية لكل موظف من تبويب 'إدخال الأداء' (أو استوردها عبر الإكسل).
        3. **📊 لوحة المعلومات:** استعرض الحسابات التلقائية، والترتيب، والرسوم البيانية لتقييم أداء الفريق.
        4. **🎯 التطوير:** حدد الموظفين الذين يحتاجون للتدريب وأنشئ خطط تحسين مستهدفة من تبويب 'التطوير'.
        """)
        st.markdown("---")
        
        for kpi, w, desc in [
            ("تقييم تجربة الضيف", "20%", "تقييم تجربة الضيف عبر اتصالات المتابعة من فريق علاقات الضيوف. يؤثر على الولاء والسمعة."),
            ("الحضور", "20%", "الحضور والالتزام. لا فائدة من أي مؤشر إذا الموظف غير موجود."),
            ("المبيعات الإضافية", "15%", "إيرادات الترقيات مقابل الهدف. مساهمة مباشرة في الإيرادات."),
            ("تسجيل الولاء", "15%", "تسجيلات الولاء. حجوزات مستقبلية مباشرة بدون عمولة."),
            ("تقييم المشرف", "15%", "تقييم شهري: المظهر والمهنية والإجراءات والعمل الجماعي والمبادرة."),
            ("الإنتاجية", "15%", "تسجيلات الدخول والخروج والمعاملات. الإنتاجية التشغيلية.")
        ]:
            st.markdown(f'<div class="benefit"><strong style="float:right;">{w} — {kpi}</strong><br><p class="ar">{desc}</p></div>', unsafe_allow_html=True)
        st.markdown("---")
        st.markdown("**نظام التقييم:** متميز (93+) | ممتاز (85+) | جيد (75+) | مقبول (60+) | يحتاج تطوير (<60)")
        st.markdown("</div>", unsafe_allow_html=True)
    else:
        st.markdown("## Welcome to HotelPulse")
        st.markdown("A performance management system for front office. Measures what matters, connects effort to results.")
        st.markdown("---")
        
        st.markdown("### How to Use This System")
        st.markdown("""
        1. **👥 Agents:** Add your team members in the 'Agents & Import' tab.
        2. **📝 Input:** Enter monthly KPI scores for each agent in the 'Performance Input' tab (or bulk import via Excel).
        3. **📊 Dashboard:** View automatic calculations, rankings, and visual charts to assess team performance.
        4. **🎯 Coaching:** Identify struggling agents and generate targeted action plans in the 'Coaching' tab.
        """)
        st.markdown("---")
        
        for kpi, w, desc in [
            ("Guest Experience", "20%", "Voice of the guest via follow-up calls by GR Team. Drives loyalty and reputation."),
            ("Attendance", "20%", "Presence and punctuality. No KPI matters if the agent isn't on the floor."),
            ("Upselling", "15%", "Revenue from upgrades vs target. Direct RevPAR contribution."),
            ("Enrollments", "15%", "Loyalty sign-ups. Future direct bookings bypassing OTA commissions."),
            ("Supervisor", "15%", "Monthly evaluation: grooming, professionalism, SOPs, teamwork, initiative."),
            ("Production", "15%", "Check-ins, check-outs, transactions. Operational throughput.")
        ]:
            st.markdown(f'<div class="benefit"><strong>{kpi} — {w}</strong><p>{desc}</p></div>', unsafe_allow_html=True)
        st.markdown("---")
        st.markdown("**Grading:** Exceptional (93+) | Excellent (85+) | Good (75+) | Fair (60+) | Needs Improvement (<60)")

# ═══════════════════════════════════════
# DASHBOARD
# ═══════════════════════════════════════
with tab_dash:
    conn = get_db()
    inc = (sel_month == "SAMPLE")
    kpi_df = calc_kpis(conn, sel_month, inc_sample=inc, is_ar=is_ar)
    conn.close()
    
    if len(kpi_df) == 0 or kpi_df["النتيجة النهائية" if is_ar else "Total KPI"].sum() == 0:
        st.info("لا توجد بيانات. أدخل بيانات في إدخال الأداء أو اختر SAMPLE." if is_ar else "No data for this month. Enter data in Performance Input, or select SAMPLE.")
    else:
        if inc: 
            warn_msg = "<b>وضع العرض (Portfolio Demo):</b> جميع الأسماء والبيانات والمقاييس المعروضة هي بيانات وهمية لأغراض العرض التوضيحي فقط." if is_ar else "<b>Portfolio Demo Mode:</b> All names, data, and metrics shown are synthetic and for demonstration purposes only."
            st.markdown(f'<div class="warn-banner"><p>{warn_msg}</p></div>', unsafe_allow_html=True)
        
        tot_col = "النتيجة النهائية" if is_ar else "Total KPI"
        name_col = "الاسم" if is_ar else "Name"
        grade_col = "التقييم" if is_ar else "Grade"
        
        avg = kpi_df[tot_col].mean(); top = kpi_df.iloc[0]
        exc_val = "متميز" if is_ar else "Exceptional"
        exc = len(kpi_df[kpi_df[grade_col] == exc_val])
        
        c1,c2,c3,c4 = st.columns(4)
        c1.markdown(f'<div class="kc"><div class="lbl">{"متوسط الفريق" if is_ar else "Team Average"}</div><div class="val">{avg:.1f}</div><div class="sub">{len(kpi_df)} {"موظفين" if is_ar else "agents"}</div></div>', unsafe_allow_html=True)
        c2.markdown(f'<div class="kc"><div class="lbl">{"أفضل أداء" if is_ar else "Top Performer"}</div><div class="val" style="font-size:1rem">{top[name_col]}</div><div class="sub">{top[tot_col]} — {top[grade_col]}</div></div>', unsafe_allow_html=True)
        c3.markdown(f'<div class="kc"><div class="lbl">{"متميز" if is_ar else "Exceptional"}</div><div class="val" style="color:#16A34A">{exc}</div><div class="sub">{exc/len(kpi_df)*100:.0f}%</div></div>', unsafe_allow_html=True)
        c4.markdown(f'<div class="kc"><div class="lbl">{"الفترة" if is_ar else "Period"}</div><div class="val" style="font-size:1rem">{sel_month}</div><div class="sub">{"تجريبي" if inc else "مباشر" if is_ar else "Sample" if inc else "Live"}</div></div>', unsafe_allow_html=True)
        st.markdown("")
        
        col_ch, col_pi = st.columns([3,1])
        with col_ch:
            if is_ar:
                colors = {"تجربة الضيف (20%)":"#EF4444","المشرف (15%)":"#8B5CF6","الحضور (20%)":"#3B82F6",
                          "المبيعات (15%)":"#22C55E","الولاء (15%)":"#F59E0B","الإنتاجية (15%)":"#14B8A6"}
            else:
                colors = {"Guest Experience (20%)":"#EF4444","Supervisor (15%)":"#8B5CF6","Attendance (20%)":"#3B82F6",
                          "Upselling (15%)":"#22C55E","Enrollments (15%)":"#F59E0B","Production (15%)":"#14B8A6"}
            
            fig = go.Figure()
            for col, clr in colors.items():
                if col in kpi_df.columns:
                    vals = kpi_df[col].fillna(0)
                    w = float(col.split("(")[1].replace("%)","").replace("٪)","")) / 100
                    fig.add_trace(go.Bar(name=col, x=kpi_df[name_col], y=vals * w, marker_color=clr))
            fig.update_layout(barmode="stack", paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                font=dict(family="Inter"), xaxis=dict(gridcolor="rgba(128,128,128,0.2)",tickangle=-45),
                yaxis=dict(gridcolor="rgba(128,128,128,0.2)",title="النتيجة الموزونة" if is_ar else "Weighted Score"), margin=dict(l=20,r=20,t=30,b=80), height=420,
                legend=dict(orientation="h",y=-0.35,font=dict(size=10)))
            st.plotly_chart(fig, use_container_width=True)
            
        with col_pi:
            gdc = kpi_df[grade_col].value_counts().reset_index(); gdc.columns=[grade_col,"Count"]
            color_map = {
                "Exceptional":"#16A34A","Excellent":"#2563EB","Good":"#D97706","Fair":"#EA580C","Needs Improvement":"#DC2626",
                "متميز":"#16A34A","ممتاز":"#2563EB","جيد":"#D97706","مقبول":"#EA580C","يحتاج تطوير":"#DC2626"
            }
            fig2 = px.pie(gdc, names=grade_col, values="Count", hole=0.5, color=grade_col, color_discrete_map=color_map)
            fig2.update_layout(paper_bgcolor="rgba(0,0,0,0)", font=dict(family="Inter"),
                margin=dict(l=10,r=10,t=30,b=10), height=420, legend=dict(font=dict(size=9)))
            st.plotly_chart(fig2, use_container_width=True)
            
        st.dataframe(kpi_df, use_container_width=True, height=450)
        st.download_button("تصدير CSV" if is_ar else "Export CSV", kpi_df.to_csv(index=False), f"hotelpulse_{sel_month.replace(' ','_')}.csv", "text/csv")

# ═══════════════════════════════════════
# PERFORMANCE INPUT
# ═══════════════════════════════════════
with tab_perf:
    opts_ar = ["⭐ تقييم تجربة الضيف", "👔 تقييم المشرف", "📋 الحضور", "💰 المبيعات الإضافية", "🎯 تسجيل الولاء", "📈 الإنتاجية"]
    opts_en = ["⭐ Guest Experience", "👔 Supervisor Evaluation", "📋 Attendance", "💰 Upselling", "🎯 Enrollments", "📈 Production"]
    kpi_choice = st.selectbox("اختر مؤشر الأداء" if is_ar else "Select KPI", opts_ar if is_ar else opts_en, key="kpi_sel")
    st.markdown("---")
    
    adf = get_real_agents(); ao = agent_opts(adf, is_ar); dis = len(adf) == 0
    if dis: st.warning(NO_AGENTS_MSG)

    # ── GUEST EXPERIENCE ──
    if "Guest" in kpi_choice or "تجربة" in kpi_choice:
        st.subheader("تقييم تجربة الضيف" if is_ar else "Guest Experience")
        st.caption("يتم جمعه عبر اتصالات متابعة الضيف." if is_ar else "Collected via guest follow-up calls by Guest Relations Team.")
        ans_list = list(ANS_AR.keys()) if is_ar else list(ANS_EN.keys())
        
        with st.form("gf_form", clear_on_submit=True):
            c1,c2,c3 = st.columns(3)
            with c1: fa = st.selectbox("الموظف" if is_ar else "Agent", ao, disabled=dis, key="gf_a")
            with c2: ft = st.selectbox("النوع" if is_ar else "Type", ["Check-In", "Check-Out"], disabled=dis, key="gf_t")
            with c3: fm = st.selectbox("الشهر" if is_ar else "Month", months[1:], key="gf_m", disabled=dis)
            c4,c5,c6 = st.columns(3)
            with c4: gn = st.text_input("اسم الضيف" if is_ar else "Guest Name", "", disabled=dis, key="gf_gn")
            with c5: rm = st.text_input("الغرفة" if is_ar else "Room", "", disabled=dis, key="gf_r")
            with c6: vip = st.text_input("فئة الضيف" if is_ar else "VIP Tier", "", disabled=dis, key="gf_v")
            st.markdown("---")
            
            if ft == "Check-In":
                st.markdown("**أسئلة تسجيل الدخول**" if is_ar else "**Check-In Questions**")
                q1 = st.selectbox("1. هل كان الموظف/ة مرحّب وأسلوبه لطيف؟" if is_ar else "1. Welcoming & polite?", ans_list, disabled=dis, key="ci1")
                q2 = st.selectbox("2. هل تم شرح تفاصيل الحجز بوضوح؟" if is_ar else "2. Reservation explained?", ans_list, disabled=dis, key="ci2")
                q3 = st.selectbox("3. هل تم أخذ تفضيلاتك بعين الاعتبار؟" if is_ar else "3. Preferences considered?", ans_list, disabled=dis, key="ci3")
                q4 = st.selectbox("4. إذا ما توفرت التفضيلات، هل عرض بديل؟" if is_ar else "4. Alternative offered if needed?", ans_list, disabled=dis, key="ci4")
                q5 = st.selectbox("5. هل تم شرح مرافق الفندق والخدمات؟" if is_ar else "5. Facilities explained?", ans_list, disabled=dis, key="ci5")
            else:
                st.markdown("**أسئلة تسجيل الخروج**" if is_ar else "**Check-Out Questions**")
                q1 = st.selectbox("1. هل كانت إجراءات الخروج سريعة وسلسة؟" if is_ar else "1. Quick & smooth check-out?", ans_list, disabled=dis, key="co1")
                q2 = st.selectbox("2. هل تم شرح الفاتورة بوضوح وعرض طباعتها؟" if is_ar else "2. Bill explained?", ans_list, disabled=dis, key="co2")
                q3 = st.selectbox("3. هل سألت عن الإقامة أو ملاحظات أخيرة؟" if is_ar else "3. Asked about stay?", ans_list, disabled=dis, key="co3")
                q4 = st.selectbox("4. إذا كان فيه مشكلة، هل تعامل باحترافية؟" if is_ar else "4. Issues handled professionally?", ans_list, disabled=dis, key="co4")
                q5 = st.selectbox("5. هل تم انهاء التعامل بأسلوب لطيف؟" if is_ar else "5. Polite conclusion?", ans_list, disabled=dis, key="co5")
                
            overall = st.slider("التقييم العام" if is_ar else "Overall Rating", 1, 5, 3, disabled=dis, key="ge_ov")
            comments = st.text_area("ملاحظات" if is_ar else "Comments", "", disabled=dis, key="ge_cm")
            score = calc_guest_score([q1,q2,q3,q4,q5], overall, is_ar)
            
            st.info(f"{'النتيجة المحسوبة:' if is_ar else 'Calculated Score:'} **{score}**")
            if st.form_submit_button("إرسال" if is_ar else "Submit", type="primary", use_container_width=True, disabled=dis):
                eid = fa.split(" — ")[0]; conn = get_db()
                conn.execute("""INSERT INTO guest_feedback (emp_id,month,call_type,guest_name,room,vip_tier,
                    q1,q2,q3,q4,q5,overall_rating,comments,score,caller,is_sample)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)""",
                    (eid,fm,ft,gn,rm,vip,q1,q2,q3,q4,q5,overall,comments,score,"GR Team"))
                conn.commit(); conn.close(); st.success("تم الحفظ" if is_ar else "Saved successfully")

    # ── SUPERVISOR ──
    elif "Supervisor" in kpi_choice or "المشرف" in kpi_choice:
        st.subheader("تقييم المشرف" if is_ar else "Supervisor Evaluation")
        st.caption("الحد الأقصى ١١٠." if is_ar else "Max 110 points.")
        sup_opts = ["نعم", "جزئياً", "لا"] if is_ar else ["Yes", "Partially", "No"]
        yn_opts = ["نعم", "لا"] if is_ar else ["Yes", "No"]
        
        with st.form("sup_form", clear_on_submit=True):
            c1,c2,c3 = st.columns(3)
            with c1: sa = st.selectbox("الموظف" if is_ar else "Agent", ao, key="sa", disabled=dis)
            with c2: sm2 = st.selectbox("الشهر" if is_ar else "Month", months[1:], key="sm2", disabled=dis)
            with c3: ev = st.text_input("المقيم" if is_ar else "Evaluator", "", disabled=dis, key="se_ev")
            st.markdown("---")
            
            sq1 = st.selectbox("1. هل يلتزم بالمظهر المهني؟" if is_ar else "1. Grooming standards?", sup_opts, disabled=dis, key="sq1")
            sq2 = st.selectbox("2. هل أسلوبه مهني ومحترم؟" if is_ar else "2. Professional with guests?", sup_opts, disabled=dis, key="sq2")
            sq3 = st.selectbox("3. هل يلتزم بإجراءات العمل؟" if is_ar else "3. Follows SOPs?", sup_opts, disabled=dis, key="sq3")
            sq4 = st.selectbox("4. هل يتعاون مع الفريق؟" if is_ar else "4. Team cooperation?", sup_opts, disabled=dis, key="sq4")
            sq5 = st.selectbox("5. هل يتحمّل المسؤولية ويبادر؟" if is_ar else "5. Ownership & initiative?", sup_opts, disabled=dis, key="sq5")
            sov = st.slider("6. التقييم العام" if is_ar else "6. Overall", 1, 5, 3, disabled=dis, key="sov")
            sbn = st.selectbox("7. هل قام بمهام أعلى من منصبه؟ (بونص)" if is_ar else "7. Supervisory tasks? (Bonus)", yn_opts, disabled=dis, key="sbn")
            
            sup_kpi = calc_sup_kpi([sq1,sq2,sq3,sq4,sq5], sov, sbn, is_ar)
            st.info(f"KPI: **{sup_kpi}**")
            sn = st.text_area("ملاحظات" if is_ar else "Notes", "", disabled=dis, key="sn")
            if st.form_submit_button("حفظ" if is_ar else "Save", type="primary", use_container_width=True, disabled=dis):
                eid = sa.split(" — ")[0]; conn = get_db()
                conn.execute("""INSERT OR REPLACE INTO supervisor_eval
                    (emp_id,month,q1,q2,q3,q4,q5,overall_rating,bonus_task,kpi,evaluator,notes,is_sample)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0)""",
                    (eid,sm2,sq1,sq2,sq3,sq4,sq5,sov,sbn,sup_kpi,ev,sn))
                conn.commit(); conn.close(); st.success("تم الحفظ" if is_ar else "Saved successfully")

    # ── ATTENDANCE ──
    elif "Attendance" in kpi_choice or "الحضور" in kpi_choice:
        st.subheader("الحضور" if is_ar else "Attendance")
        with st.form("att_form"):
            c1,c2 = st.columns(2)
            with c1: aa = st.selectbox("الموظف" if is_ar else "Agent", ao, key="aa", disabled=dis)
            with c2: am = st.selectbox("الشهر" if is_ar else "Month", months[1:], key="am", disabled=dis)
            c3,c4,c5,c6 = st.columns(4)
            with c3: pr = st.number_input("أيام الحضور" if is_ar else "Days Present", 0, 31, 24, disabled=dis, key="at_p")
            with c4: ab = st.number_input("الغياب" if is_ar else "Absent", 0, 31, 2, disabled=dis, key="at_a")
            with c5: lt = st.number_input("مرات التأخير" if is_ar else "Late Count", 0, 31, 1, disabled=dis, key="at_l")
            with c6: lm = st.number_input("دقائق التأخير" if is_ar else "Late Min", 0, 500, 10, disabled=dis, key="at_m")
            
            asc = max(0, round(100 - (ab * 8) - (lm * 0.3), 1))
            st.info(f"{'النتيجة:' if is_ar else 'Score:'} **{asc}**")
            if st.form_submit_button("حفظ" if is_ar else "Save", type="primary", use_container_width=True, disabled=dis):
                eid = aa.split(" — ")[0]; conn = get_db()
                conn.execute("INSERT OR REPLACE INTO attendance VALUES (?,?,?,?,?,?,?,0)", (eid,am,pr,ab,lt,lm,asc))
                conn.commit(); conn.close(); st.success("تم الحفظ" if is_ar else "Saved successfully")

    # ── UPSELLING ──
    elif "Upselling" in kpi_choice or "المبيعات" in kpi_choice:
        st.subheader("المبيعات الإضافية" if is_ar else "Upselling")
        with st.form("ups_form"):
            c1,c2 = st.columns(2)
            with c1: ua = st.selectbox("الموظف" if is_ar else "Agent", ao, key="ua", disabled=dis)
            with c2: um = st.selectbox("الشهر" if is_ar else "Month", months[1:], key="um", disabled=dis)
            c3,c4,c5 = st.columns(3)
            with c3: ut = st.number_input("الهدف (ريال)" if is_ar else "Target SAR", 0, 100000, 8000, disabled=dis, key="up_t")
            with c4: uac = st.number_input("الفعلي (ريال)" if is_ar else "Actual SAR", 0, 100000, 6500, disabled=dis, key="up_a")
            with c5: uc = st.number_input("عدد العمليات" if is_ar else "Upsell Count", 0, 100, 8, disabled=dis, key="up_c")
            
            us = round(min(100, (uac / max(ut, 1)) * 100), 1)
            st.info(f"{'النتيجة:' if is_ar else 'Score:'} **{us}**")
            if st.form_submit_button("حفظ" if is_ar else "Save", type="primary", use_container_width=True, disabled=dis):
                eid = ua.split(" — ")[0]; conn = get_db()
                conn.execute("INSERT OR REPLACE INTO upselling VALUES (?,?,?,?,?,?,0)", (eid,um,ut,uac,uc,us))
                conn.commit(); conn.close(); st.success("تم الحفظ" if is_ar else "Saved successfully")

    # ── ENROLLMENTS ──
    elif "Enrollments" in kpi_choice or "الولاء" in kpi_choice:
        st.subheader("تسجيل الولاء" if is_ar else "Loyalty Enrollments")
        with st.form("enr_form"):
            c1,c2 = st.columns(2)
            with c1: ea = st.selectbox("الموظف" if is_ar else "Agent", ao, key="ea", disabled=dis)
            with c2: em2 = st.selectbox("الشهر" if is_ar else "Month", months[1:], key="em2", disabled=dis)
            c3,c4 = st.columns(2)
            with c3: et = st.number_input("الهدف" if is_ar else "Target", 0, 50, 10, disabled=dis, key="en_t")
            with c4: eac = st.number_input("الفعلي" if is_ar else "Actual", 0, 50, 8, disabled=dis, key="en_a")
            
            es = round(min(120, (eac / max(et, 1)) * 100), 1)
            st.info(f"{'النتيجة:' if is_ar else 'Score:'} **{es}**")
            if st.form_submit_button("حفظ" if is_ar else "Save", type="primary", use_container_width=True, disabled=dis):
                eid = ea.split(" — ")[0]; conn = get_db()
                conn.execute("INSERT OR REPLACE INTO enrollments VALUES (?,?,?,?,?,0)", (eid,em2,et,eac,es))
                conn.commit(); conn.close(); st.success("تم الحفظ" if is_ar else "Saved successfully")

    # ── PRODUCTION ──
    elif "Production" in kpi_choice or "الإنتاجية" in kpi_choice:
        st.subheader("الإنتاجية" if is_ar else "Production")
        with st.form("prod_form"):
            c1,c2 = st.columns(2)
            with c1: pa = st.selectbox("الموظف" if is_ar else "Agent", ao, key="pa", disabled=dis)
            with c2: pm2 = st.selectbox("الشهر" if is_ar else "Month", months[1:], key="pm2", disabled=dis)
            c3,c4,c5 = st.columns(3)
            with c3: pci = st.number_input("تسجيل دخول" if is_ar else "Check-Ins", 0, 500, 70, disabled=dis, key="pr_ci")
            with c4: pco = st.number_input("تسجيل خروج" if is_ar else "Check-Outs", 0, 500, 55, disabled=dis, key="pr_co")
            with c5: ptr = st.number_input("معاملات أخرى" if is_ar else "Transactions", 0, 1000, 120, disabled=dis, key="pr_tr")
            
            ps = round(min(100, (pci + pco + ptr) / 4.0), 1)
            st.info(f"{'النتيجة:' if is_ar else 'Score:'} **{ps}**")
            if st.form_submit_button("حفظ" if is_ar else "Save", type="primary", use_container_width=True, disabled=dis):
                eid = pa.split(" — ")[0]; conn = get_db()
                conn.execute("INSERT OR REPLACE INTO production VALUES (?,?,?,?,?,?,0)", (eid,pm2,pci,pco,ptr,ps))
                conn.commit(); conn.close(); st.success("تم الحفظ" if is_ar else "Saved successfully")

# ═══════════════════════════════════════
# AGENTS & IMPORT
# ═══════════════════════════════════════
with tab_agents:
    agent_section, import_section = st.tabs(["👥 الموظفين", "📤 استيراد"] if is_ar else ["👥 Agents", "📤 Import"])

    with agent_section:
        st.subheader("إدارة الموظفين" if is_ar else "Agent Management")
        conn = get_db()
        with st.form("add_ag", clear_on_submit=True):
            c1,c2,c3 = st.columns(3)
            with c1: ni = st.text_input("رقم الموظف" if is_ar else "Employee ID", "", key="ag_id")
            with c2: nn = st.text_input("الاسم" if is_ar else "Full Name", "", key="ag_nm")
            
            pos_opts = ["موظف","موظف أول","موظف ليلي","مشرف"] if is_ar else ["Agent","Senior Agent","Night Agent","Supervisor"]
            with c3: np2 = st.selectbox("المسمى" if is_ar else "Position", pos_opts, key="ag_pos")
            
            if st.form_submit_button("إضافة" if is_ar else "Add", type="primary"):
                if ni.strip() and nn.strip():
                    try:
                        conn.execute("INSERT INTO agents (emp_id,name,position,is_sample) VALUES (?,?,?,0)", (ni.strip(),nn.strip(),np2))
                        conn.commit(); st.success("تم الإضافة" if is_ar else "Added successfully"); st.rerun()
                    except sqlite3.IntegrityError: st.error("الرقم موجود مسبقا" if is_ar else "ID already exists.")
        st.divider()
        ra = pd.read_sql("SELECT emp_id as ID, name as Name, position as Position FROM agents WHERE active=1 AND is_sample=0 ORDER BY emp_id", conn)
        if len(ra) > 0: st.dataframe(ra, use_container_width=True, height=300)
        else: st.caption("لا يوجد موظفين بعد." if is_ar else "No agents yet.")
        conn.close()

    with import_section:
        st.subheader("استيراد إكسل" if is_ar else "Import Excel")
        st.caption("الصيغة: Name | ID | Scores" if is_ar else "Format: Agent Name | Employee ID | scores")
        conn = get_db()
        upm = st.selectbox("استيراد لشهر" if is_ar else "Import into month", months[1:], key="upm")
        cg, cs = st.columns(2)
        with cg:
            st.markdown("**تقييم تجربة الضيف**" if is_ar else "**Guest Experience**")
            gf = st.file_uploader("رفع ملف" if is_ar else "Upload", type=["xlsx"], key="gf_up")
            if gf:
                gfd = pd.read_excel(gf); st.dataframe(gfd, height=180)
                if st.button("استيراد" if is_ar else "Import Guest Experience", type="primary", key="imp_ge"):
                    n=0
                    for _, r in gfd.iterrows():
                        eid = str(int(r.iloc[1])) if pd.notna(r.iloc[1]) else None
                        ci = float(r.iloc[2]) if pd.notna(r.iloc[2]) else None
                        co = float(r.iloc[3]) if pd.notna(r.iloc[3]) else None
                        if eid:
                            if ci is not None: conn.execute("INSERT INTO guest_feedback (emp_id,month,call_type,guest_name,score,caller,is_sample) VALUES (?,?,?,?,?,?,0)", (eid,upm,"Check-In","Excel",ci,"Import"))
                            if co is not None: conn.execute("INSERT INTO guest_feedback (emp_id,month,call_type,guest_name,score,caller,is_sample) VALUES (?,?,?,?,?,?,0)", (eid,upm,"Check-Out","Excel",co,"Import"))
                            n+=1
                    conn.commit(); st.success(f"تم استيراد {n} سجل" if is_ar else f"Imported {n}.")
        with cs:
            st.markdown("**تقييم المشرف**" if is_ar else "**Supervisor**")
            sf = st.file_uploader("رفع ملف" if is_ar else "Upload", type=["xlsx"], key="sf_up")
            if sf:
                sfd = pd.read_excel(sf); st.dataframe(sfd, height=180)
                if st.button("استيراد" if is_ar else "Import Supervisor", type="primary", key="imp_se"):
                    n=0
                    for _, r in sfd.iterrows():
                        eid = str(int(r.iloc[1])) if pd.notna(r.iloc[1]) else None
                        kpi = float(r.iloc[2]) if pd.notna(r.iloc[2]) else None
                        if eid and kpi:
                            conn.execute("INSERT OR REPLACE INTO supervisor_eval (emp_id,month,kpi,evaluator,is_sample) VALUES (?,?,?,?,0)", (eid,upm,kpi,"Excel"))
                            n+=1
                    conn.commit(); st.success(f"تم استيراد {n} سجل" if is_ar else f"Imported {n}.")
        conn.close()

# ═══════════════════════════════════════
# COACHING & DEVELOPMENT
# ═══════════════════════════════════════
with tab_coach:
    st.subheader("التطوير والتدريب" if is_ar else "Coaching & Development")
    st.caption("تحديد الموظفين تحت ٧٥٪ وبناء خطط تحسين مستهدفة." if is_ar else "Identify agents below 75% and build targeted improvement plans.")

    conn = get_db()
    inc = (sel_month == "SAMPLE")
    kpi_df = calc_kpis(conn, sel_month, inc_sample=inc, is_ar=False) # Always calc in EN for logic

    if len(kpi_df) == 0 or kpi_df["Total KPI"].sum() == 0:
        st.info("لا توجد بيانات. أدخل بيانات أولا." if is_ar else "No KPI data. Enter data first.")
    else:
        kpi_cols = {"Guest Experience (20%)":"Guest Experience", "Supervisor (15%)":"Supervisor",
                    "Attendance (20%)":"Attendance", "Upselling (15%)":"Upselling",
                    "Enrollments (15%)":"Enrollments", "Production (15%)":"Production"}
        struggling = []
        for _, row in kpi_df.iterrows():
            lowest_col = None; lowest_val = 999
            for col, label in kpi_cols.items():
                v = row[col]
                if v is not None and v < lowest_val: lowest_val = v; lowest_col = label
            if row["Total KPI"] < 75 or (lowest_val < 75):
                struggling.append({"Emp ID": row["Emp ID"], "Name": row["Name"],
                    "Total KPI": row["Total KPI"], "Grade": row["Grade"],
                    "Lowest KPI": lowest_col, "Lowest Score": round(lowest_val, 1) if lowest_val != 999 else None})

        if len(struggling) == 0:
            st.success("جميع الموظفين فوق ٧٥٪. لا حاجة لخطط تحسين." if is_ar else "All agents at 75%+ across all KPIs. No action plans needed.")
        else:
            st.markdown(f"**{len(struggling)} موظف يحتاج تطوير**" if is_ar else f"**{len(struggling)} agent(s) need coaching**")
            st.dataframe(pd.DataFrame(struggling), use_container_width=True, height=180)

            str_opts = [f"{s['Emp ID']} — {s['Name']} ({s['Lowest KPI']}: {s['Lowest Score']})" for s in struggling]
            selected = st.selectbox("اختر موظف" if is_ar else "Select agent", str_opts, key="co_sel")
            if selected:
                sel_eid = selected.split(" — ")[0]
                sel_info = next(s for s in struggling if s["Emp ID"] == sel_eid)
                lowest = sel_info["Lowest KPI"] or "Guest Experience"
                
                preset_dict = PIP_PRESETS_AR if is_ar else PIP_PRESETS_EN
                preset = preset_dict.get(lowest, "1. Schedule meeting.\n2. Set targets.")
                
                st.markdown(f"**{'الخطة لـ' if is_ar else 'Plan for'}: {lowest}**")
                plan_text = st.text_area("عدل الخطة" if is_ar else "Edit plan", preset, height=160, key="co_pl")
                created_by = st.text_input("أنشأها" if is_ar else "Created by", "", key="co_cr")
                if st.button("حفظ الخطة" if is_ar else "Save Plan", type="primary", use_container_width=True, key="co_sv"):
                    conn.execute("INSERT INTO action_plans (emp_id,month,lowest_kpi,plan_text,created_by) VALUES (?,?,?,?,?)",
                        (sel_eid, sel_month, lowest, plan_text, created_by))
                    conn.commit(); st.success("تم الحفظ" if is_ar else f"Saved for {sel_info['Name']}.")

    st.divider()
    st.subheader("الخطط المحفوظة" if is_ar else "Saved Plans")
    plans = pd.read_sql("""SELECT ap.created_at as Date, a.name as Agent, ap.month as Month,
        ap.lowest_kpi as 'Focus', ap.plan_text as Plan, ap.created_by as 'By'
        FROM action_plans ap JOIN agents a ON ap.emp_id=a.emp_id ORDER BY ap.id DESC LIMIT 20""", conn)
    if len(plans) > 0: st.dataframe(plans, use_container_width=True, height=250)
    else: st.caption("لا توجد خطط." if is_ar else "No plans saved.")
    conn.close()