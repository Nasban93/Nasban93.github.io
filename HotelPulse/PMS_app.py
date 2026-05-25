"""
PMS — Front Office Performance Management System
نظام إدارة أداء الاستقبال
"""

import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
import pandas as pd
import numpy as np
import sqlite3
from datetime import datetime

st.set_page_config(page_title="PMS — Performance Management", page_icon="📊", layout="wide")

# ── LANGUAGE TOGGLE (must be first) ──
if "lang" not in st.session_state:
    st.session_state.lang = "en"

# Sidebar language toggle rendered early so we know before building UI
with st.sidebar:
    _lang_pick = st.radio("Language / اللغة", ["English", "العربية"], horizontal=True,
                          index=0 if st.session_state.lang == "en" else 1)
    st.session_state.lang = "ar" if _lang_pick == "العربية" else "en"

AR = st.session_state.lang == "ar"

# ── FULL TRANSLATION DICT ──
T = {
    # General
    "app_title": ("PMS — Front Office Performance Management", "نظام إدارة أداء مكتب الاستقبال"),
    "your_property": ("Your Property", "الفندق"),
    "property_label": ("Property", "الفندق"),
    "property_placeholder": ("Enter hotel name", "أدخل اسم الفندق"),
    "month_label": ("Month", "الشهر"),
    "your_agents": ("Your Agents", "موظفينك"),
    "remove_sample": ("Remove Sample Data", "حذف البيانات التجريبية"),
    "load_sample": ("Load Sample Data", "تحميل بيانات تجريبية"),
    "sample_loaded": ("Sample data loaded (select SAMPLE month)", "البيانات التجريبية محملة (اختر شهر SAMPLE)"),
    "export_csv": ("Export CSV", "تصدير CSV"),
    "save": ("Save", "حفظ"),
    "submit": ("Submit", "إرسال"),
    "add": ("Add", "إضافة"),
    "score": ("Score", "النتيجة"),
    "agent": ("Agent", "الموظف"),
    "month": ("Month", "الشهر"),
    "notes": ("Notes", "ملاحظات"),

    # Tabs
    "tab_guide": ("Guide", "الدليل"),
    "tab_dashboard": ("Dashboard", "لوحة المعلومات"),
    "tab_perf": ("Performance Input", "إدخال الأداء"),
    "tab_agents": ("Agents & Import", "الموظفين والاستيراد"),
    "tab_coaching": ("Coaching", "التطوير"),

    # Sub-tabs
    "tab_agents_sub": ("Agents", "الموظفين"),
    "tab_import_sub": ("Import", "استيراد"),

    # Dashboard
    "team_avg": ("Team Average", "متوسط الفريق"),
    "top_perf": ("Top Performer", "أفضل أداء"),
    "exceptional": ("Exceptional", "متميز"),
    "period": ("Period", "الفترة"),
    "no_data": ("No data for this month. Enter data in Performance Input, or select SAMPLE.",
                "لا توجد بيانات لهذا الشهر. أدخل بيانات في إدخال الأداء أو اختر SAMPLE."),
    "sample_banner": ("Viewing sample data", "عرض البيانات التجريبية"),
    "weighted_score": ("Weighted Score", "النتيجة المرجحة"),

    # KPI selector
    "select_kpi": ("Select KPI", "اختر مؤشر الأداء"),
    "kpi_guest": ("Guest Experience", "تقييم تجربة الضيف"),
    "kpi_supervisor": ("Supervisor Evaluation", "تقييم المشرف"),
    "kpi_attendance": ("Attendance", "الحضور"),
    "kpi_upselling": ("Upselling", "المبيعات الإضافية"),
    "kpi_enrollments": ("Loyalty Enrollments", "تسجيل الولاء"),
    "kpi_production": ("Production", "الإنتاجية"),

    # No agents
    "no_agents": ("No agents registered. Forms are disabled. Add your team in Agents & Import.",
                  "لا يوجد موظفين مسجلين. النماذج معطلة. أضف فريقك في تبويب الموظفين والاستيراد."),
    "no_agents_placeholder": ("— No agents —", "— لا يوجد موظفين —"),

    # Guest Experience
    "ge_title": ("Guest Experience", "تقييم تجربة الضيف"),
    "ge_desc": ("Collected via guest follow-up calls by Guest Relations Team. Questions change based on interaction type.",
                "يتم جمعه عبر اتصالات متابعة الضيف من فريق علاقات الضيوف. الأسئلة تتغير حسب نوع التفاعل."),
    "interaction_type": ("Interaction Type", "نوع التفاعل"),
    "guest_name": ("Guest Name", "اسم الضيف"),
    "room": ("Room", "الغرفة"),
    "vip_tier": ("VIP Tier", "فئة VIP"),
    "checkin_qs": ("Check-In Questions", "أسئلة تسجيل الدخول"),
    "checkout_qs": ("Check-Out Questions", "أسئلة تسجيل الخروج"),
    "ci_q1": ("Was the agent welcoming and courteous?", "هل كان الموظف/ة مرحّب وأسلوبه لطيف؟"),
    "ci_q2": ("Did the agent clearly explain the reservation details?", "هل تم شرح تفاصيل الحجز بوضوح؟"),
    "ci_q3": ("Did the agent take your preferences into consideration?", "هل تم أخذ تفضيلاتك بعين الاعتبار؟"),
    "ci_q4": ("If preferences unavailable, was an alternative offered?", "إذا ما توفرت التفضيلات، هل عرض بديل؟"),
    "ci_q5": ("Did the agent explain hotel facilities and services?", "هل تم شرح مرافق الفندق والخدمات؟"),
    "co_q1": ("Was the check-out process quick and smooth?", "هل كانت إجراءات الخروج سريعة وسلسة؟"),
    "co_q2": ("Was the bill clearly explained? Print/email offered?", "هل تم شرح الفاتورة بوضوح وعرض طباعتها أو إرسالها؟"),
    "co_q3": ("Did the agent ask about your stay or final comments?", "هل سألت عن الإقامة أو ملاحظات أخيرة؟"),
    "co_q4": ("If there was an issue, was it handled professionally?", "إذا كان فيه مشكلة، هل تعامل باحترافية؟"),
    "co_q5": ("Did the agent conclude politely and professionally?", "هل تم انهاء التعامل بأسلوب لطيف؟"),
    "overall_rating": ("Overall rating", "التقييم العام"),
    "comments": ("Comments", "ملاحظات"),
    "calculated_score": ("Calculated Score", "النتيجة المحسوبة"),
    "calls": ("Calls", "المكالمات"),

    # Answer options
    "ans_yes": ("Yes", "نعم"),
    "ans_partial": ("Partially", "جزئياً"),
    "ans_no": ("No", "لا"),
    "ans_na": ("N/A", "ما ينطبق"),

    # Supervisor
    "sup_title": ("Supervisor Evaluation", "تقييم المشرف"),
    "sup_desc": ("5 competency questions + overall rating + bonus task. Max score: 110.",
                 "٥ أسئلة كفاءات + تقييم عام + مهام إضافية. الحد الأقصى ١١٠."),
    "evaluator": ("Evaluator", "المقيم"),
    "sq1": ("Does the employee comply with grooming and uniform standards?", "هل يلتزم الموظف/ة بالمظهر المهني حسب سياسة الفندق؟"),
    "sq2": ("Is the employee professional, clear, and courteous with guests?", "هل أسلوب الموظف مع الضيوف مهني، واضح، ومحترم؟"),
    "sq3": ("Does the employee follow SOPs and service standards?", "هل يلتزم الموظف بإجراءات العمل ومعايير الخدمة المعتمدة؟"),
    "sq4": ("Does the employee cooperate with the team?", "هل يتعاون الموظف مع الفريق ويدعم زملاءه أثناء العمل؟"),
    "sq5": ("Does the employee take ownership and show initiative?", "هل يتحمّل الموظف مسؤولية مهامه ويبادر بحل المشاكل؟"),
    "sq_bonus": ("Did the employee perform supervisory-level tasks beyond their role? (Bonus)", "هل قام الموظف بمهام أعلى من منصبه الوظيفي؟ (مكافأة)"),

    # Attendance
    "att_desc": ("Score = 100 - (Absences × 8) - (Late Minutes × 0.3)",
                 "النتيجة = ١٠٠ - (أيام الغياب × ٨) - (دقائق التأخير × ٠.٣)"),
    "present": ("Present", "حاضر"),
    "absent": ("Absent", "غائب"),
    "late": ("Times Late", "مرات التأخير"),
    "late_min": ("Late Minutes", "دقائق التأخير"),

    # Upselling
    "ups_desc": ("Score = (Actual / Target) × 100. Max 100%.",
                 "النتيجة = (الفعلي / الهدف) × ١٠٠. الحد الأقصى ١٠٠٪."),
    "target_sar": ("Target SAR", "الهدف بالريال"),
    "actual_sar": ("Actual SAR", "الفعلي بالريال"),
    "upsells": ("Upsells", "عدد المبيعات"),

    # Enrollments
    "enr_desc": ("Score = (Actual / Target) × 100. Up to 120%.",
                 "النتيجة = (الفعلي / الهدف) × ١٠٠. حتى ١٢٠٪."),
    "target": ("Target", "الهدف"),
    "actual": ("Actual", "الفعلي"),

    # Production
    "prod_desc": ("Score = (Check-Ins + Check-Outs + Transactions) / 4. Max 100.",
                  "النتيجة = (دخول + خروج + معاملات) / ٤. الحد الأقصى ١٠٠."),
    "checkins": ("Check-Ins", "تسجيل دخول"),
    "checkouts": ("Check-Outs", "تسجيل خروج"),
    "transactions": ("Transactions", "معاملات"),

    # Agents
    "agent_mgmt": ("Agent Management", "إدارة الموظفين"),
    "emp_id": ("Employee ID", "رقم الموظف"),
    "full_name": ("Full Name", "الاسم الكامل"),
    "position": ("Position", "المسمى الوظيفي"),
    "no_agents_yet": ("No agents yet.", "لا يوجد موظفين بعد."),
    "sample_agents": ("Sample Agents", "موظفين تجريبيين"),
    "id_exists": ("ID already exists.", "الرقم موجود مسبقاً."),
    "added": ("Added", "تمت الإضافة"),

    # Import
    "import_title": ("Import Excel", "استيراد إكسل"),
    "import_desc": ("Upload your existing Excel files.", "ارفع ملفات الإكسل الموجودة."),
    "import_into": ("Import into month", "استيراد لشهر"),
    "import_btn_ge": ("Import Guest Experience", "استيراد تقييم الضيوف"),
    "import_btn_sup": ("Import Supervisor", "استيراد تقييم المشرف"),
    "imported": ("Imported", "تم الاستيراد"),

    # Coaching
    "coach_title": ("Coaching & Development", "التطوير والتدريب"),
    "coach_desc": ("Identify agents below 75% and build targeted improvement plans.",
                   "تحديد الموظفين تحت ٧٥٪ وبناء خطط تحسين مستهدفة."),
    "no_kpi_data": ("No KPI data. Enter data first.", "لا توجد بيانات. أدخل بيانات أولاً."),
    "all_above": ("All agents at 75%+ across all KPIs. No action plans needed.",
                  "جميع الموظفين فوق ٧٥٪. لا حاجة لخطط تحسين."),
    "needs_coaching": ("agent(s) need coaching", "موظف يحتاج تطوير"),
    "select_agent": ("Select agent for action plan", "اختر موظف لخطة التحسين"),
    "plan_for": ("Plan for", "خطة لـ"),
    "edit_plan": ("Edit the plan", "عدل الخطة"),
    "created_by": ("Created by", "أنشأها"),
    "save_plan": ("Save Plan", "حفظ الخطة"),
    "saved_plans": ("Saved Action Plans", "الخطط المحفوظة"),
    "saved_for": ("Action plan saved for", "تم حفظ خطة التحسين لـ"),

    # Guide
    "guide_welcome": ("Welcome to PMS", "مرحبا بك في نظام إدارة الأداء"),
    "guide_intro": (
        "A performance management system for front office operations. Measures what matters, connects effort to business results, gives managers data to coach and develop their team.",
        "نظام إدارة أداء مصمم لعمليات مكتب الاستقبال. يقيس ما يهم ويربط الجهد بنتائج العمل ويعطي المديرين بيانات للتدريب والتطوير."
    ),
    "guide_grading": (
        "Grading: Exceptional (93+) | Excellent (85+) | Good (75+) | Fair (60+) | Needs Improvement (<60)",
        "سلم التقييم: متميز (٩٣+) | ممتاز (٨٥+) | جيد (٧٥+) | مقبول (٦٠+) | يحتاج تطوير (أقل من ٦٠)"
    ),
    "guide_quickstart": (
        "Quick Start: Select SAMPLE month to explore, then add agents and enter real data.",
        "البداية السريعة: اختر شهر SAMPLE للاستكشاف، ثم أضف موظفينك وأدخل بيانات حقيقية."
    ),
}

def tx(key):
    """Get translated string."""
    pair = T.get(key, (key, key))
    return pair[1] if AR else pair[0]

def ans_options():
    return [tx("ans_yes"), tx("ans_partial"), tx("ans_no"), tx("ans_na")]

def ans_yn():
    return [tx("ans_yes"), tx("ans_no")]

def sup_ans():
    return [tx("ans_yes"), tx("ans_partial"), tx("ans_no")]

# Answer scoring (works regardless of language)
def ans_val(a):
    yes_words = ("Yes", "نعم")
    partial_words = ("Partially", "جزئياً")
    na_words = ("N/A", "ما ينطبق")
    if any(w in a for w in yes_words): return 1.0
    if any(w in a for w in partial_words): return 0.5
    if any(w in a for w in na_words): return None
    return 0.0

# ── CSS ──
_rtl_css = """
    .main .block-container { direction: rtl; text-align: right; }
    .stSelectbox label, .stTextInput label, .stNumberInput label,
    .stSlider label, .stTextArea label, .stRadio label { direction: rtl; text-align: right; }
""" if AR else ""

st.markdown(f"""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Kufi+Arabic:wght@400;600;700&display=swap');
.stApp {{ background-color: #FAFBFC; }}
section[data-testid="stSidebar"] {{ background: #F0F2F5; }}
{_rtl_css}
.pms-hd {{ padding:0.8rem 0; border-bottom:2px solid #2563EB; margin-bottom:1rem; display:flex; align-items:center; justify-content:space-between; }}
.pms-hd h1 {{ font-family:{'Noto Kufi Arabic' if AR else 'Inter'},sans-serif; font-size:1.3rem; color:#1E293B; margin:0; font-weight:700; }}
.pms-hd span {{ font-size:0.7rem; color:#64748B; letter-spacing:0.1em; text-transform:uppercase; }}
.kc {{ background:#fff; border:1px solid #E2E8F0; border-radius:8px; padding:1rem; text-align:center; }}
.kc .lbl {{ font-size:0.65rem; color:#64748B; text-transform:uppercase; letter-spacing:0.08em; }}
.kc .val {{ font-size:1.5rem; font-weight:700; color:#1E293B; margin:0.1rem 0; }}
.kc .sub {{ font-size:0.75rem; color:#94A3B8; }}
.benefit {{ background:linear-gradient(135deg,#EFF6FF,#F0F9FF); border-left:3px solid #2563EB; padding:0.8rem 1rem; border-radius:0 8px 8px 0; margin:0.5rem 0; }}
.benefit strong {{ color:#1E40AF; font-size:0.85rem; }}
.benefit p {{ color:#334155; font-size:0.82rem; margin:0.2rem 0 0; line-height:1.5; }}
.warn-banner {{ background:#FEF3C7; border:1px solid #F59E0B; border-radius:8px; padding:0.6rem 1rem; margin:0.5rem 0; }}
.warn-banner p {{ color:#92400E; font-size:0.82rem; margin:0; }}
.footer {{ border-top:1px solid rgba(128,128,128,0.2); padding-top:0.8rem; margin-top:1.5rem; text-align:center; }}
.footer p {{ font-size:0.7rem; color:#94A3B8; margin:0.15rem 0; line-height:1.5; }}
.footer a {{ color:#64748B; text-decoration:none; }}
.footer a:hover {{ color:#2563EB; text-decoration:underline; }}
#MainMenu,footer {{visibility:hidden;}}
</style>
""", unsafe_allow_html=True)

# ── DATABASE ──
DB = "pms_data.db"
def get_db():
    conn = sqlite3.connect(DB); conn.execute("PRAGMA journal_mode=WAL"); return conn

def init_db():
    c = get_db()
    c.executescript("""
    CREATE TABLE IF NOT EXISTS agents (emp_id TEXT PRIMARY KEY, name TEXT NOT NULL, position TEXT DEFAULT 'Agent', active INTEGER DEFAULT 1, is_sample INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS guest_feedback (id INTEGER PRIMARY KEY AUTOINCREMENT, emp_id TEXT NOT NULL, month TEXT NOT NULL, call_type TEXT NOT NULL, guest_name TEXT DEFAULT '', room TEXT DEFAULT '', vip_tier TEXT DEFAULT '', q1 TEXT, q2 TEXT, q3 TEXT, q4 TEXT, q5 TEXT, overall_rating INTEGER DEFAULT 3, comments TEXT DEFAULT '', score REAL NOT NULL, caller TEXT DEFAULT '', is_sample INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS supervisor_eval (id INTEGER PRIMARY KEY AUTOINCREMENT, emp_id TEXT NOT NULL, month TEXT NOT NULL, q1 TEXT, q2 TEXT, q3 TEXT, q4 TEXT, q5 TEXT, overall_rating INTEGER DEFAULT 3, bonus_task TEXT DEFAULT 'No', kpi REAL NOT NULL, evaluator TEXT DEFAULT '', notes TEXT DEFAULT '', is_sample INTEGER DEFAULT 0, UNIQUE(emp_id, month));
    CREATE TABLE IF NOT EXISTS attendance (emp_id TEXT NOT NULL, month TEXT NOT NULL, days_present INTEGER DEFAULT 0, days_absent INTEGER DEFAULT 0, late_count INTEGER DEFAULT 0, late_minutes INTEGER DEFAULT 0, score REAL, is_sample INTEGER DEFAULT 0, PRIMARY KEY(emp_id, month));
    CREATE TABLE IF NOT EXISTS upselling (emp_id TEXT NOT NULL, month TEXT NOT NULL, target REAL DEFAULT 0, actual REAL DEFAULT 0, count INTEGER DEFAULT 0, score REAL, is_sample INTEGER DEFAULT 0, PRIMARY KEY(emp_id, month));
    CREATE TABLE IF NOT EXISTS enrollments (emp_id TEXT NOT NULL, month TEXT NOT NULL, target INTEGER DEFAULT 0, actual INTEGER DEFAULT 0, score REAL, is_sample INTEGER DEFAULT 0, PRIMARY KEY(emp_id, month));
    CREATE TABLE IF NOT EXISTS production (emp_id TEXT NOT NULL, month TEXT NOT NULL, checkins INTEGER DEFAULT 0, checkouts INTEGER DEFAULT 0, transactions INTEGER DEFAULT 0, score REAL, is_sample INTEGER DEFAULT 0, PRIMARY KEY(emp_id, month));
    CREATE TABLE IF NOT EXISTS action_plans (id INTEGER PRIMARY KEY AUTOINCREMENT, emp_id TEXT NOT NULL, month TEXT NOT NULL, lowest_kpi TEXT, plan_text TEXT, created_by TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    """)
    c.close()

def has_sample():
    conn = get_db(); n = conn.execute("SELECT COUNT(*) FROM agents WHERE is_sample=1").fetchone()[0]; conn.close(); return n > 0

def load_sample():
    conn = get_db()
    if has_sample(): conn.close(); return
    agents = [("S001","Ahmed Al-Rashidi","Senior Agent"),("S002","Fatimah Al-Harbi","Agent"),("S003","Mohammed Al-Qahtani","Agent"),("S004","Noura Al-Shehri","Night Agent"),("S005","Khalid Al-Dossari","Senior Agent"),("S006","Sara Al-Mutairi","Agent"),("S007","Omar Al-Ghamdi","Agent"),("S008","Reem Al-Otaibi","Senior Agent"),("S009","Fahad Al-Zahrani","Night Agent"),("S010","Lina Al-Maliki","Agent"),("S011","Turki Al-Shamrani","Agent"),("S012","Maha Al-Yami","Agent"),("S013","Bandar Al-Enazi","Senior Agent"),("S014","Dalal Al-Tamimi","Agent"),("S015","Faisal Al-Subai","Night Agent"),("S016","Huda Al-Juhani","Agent"),("S017","Youssef Al-Balawi","Agent"),("S018","Arwa Al-Harthy","Senior Agent")]
    for eid, name, pos in agents:
        conn.execute("INSERT OR IGNORE INTO agents (emp_id,name,position,is_sample) VALUES (?,?,?,1)", (eid, name, pos))
    np.random.seed(42); month = "SAMPLE"
    for eid, _, _ in agents:
        for _ in range(np.random.randint(3, 7)):
            conn.execute("INSERT INTO guest_feedback (emp_id,month,call_type,guest_name,score,caller,is_sample) VALUES (?,?,?,?,?,?,1)", (eid, month, "Check-In", f"Guest {np.random.randint(100,999)}", round(np.random.uniform(75,100),2), "GR Team"))
        for _ in range(np.random.randint(3, 7)):
            conn.execute("INSERT INTO guest_feedback (emp_id,month,call_type,guest_name,score,caller,is_sample) VALUES (?,?,?,?,?,?,1)", (eid, month, "Check-Out", f"Guest {np.random.randint(100,999)}", round(np.random.uniform(80,100),2), "GR Team"))
        conn.execute("INSERT OR REPLACE INTO supervisor_eval (emp_id,month,kpi,evaluator,is_sample) VALUES (?,?,?,?,1)", (eid, month, round(np.random.uniform(74,110),1), "Sample"))
        pr = np.random.randint(22,27); ab = 26-pr; lt = np.random.randint(0,4); lm = lt*np.random.randint(5,18)
        conn.execute("INSERT OR REPLACE INTO attendance VALUES (?,?,?,?,?,?,?,1)", (eid,month,pr,ab,lt,lm,max(0,round(100-(ab*8)-(lm*0.3),1))))
        tg = float(np.random.choice([5000,8000,10000])); ac = round(tg*np.random.uniform(0.6,1.3))
        conn.execute("INSERT OR REPLACE INTO upselling VALUES (?,?,?,?,?,?,1)", (eid,month,tg,ac,int(np.random.randint(3,15)),round(min(100,(ac/tg)*100),1)))
        te = int(np.random.choice([8,10,12])); ae = int(np.random.randint(4,16))
        conn.execute("INSERT OR REPLACE INTO enrollments VALUES (?,?,?,?,?,1)", (eid,month,te,ae,round(min(120,(ae/te)*100),1)))
        ci=int(np.random.randint(40,120)); co=int(np.random.randint(30,100)); tr=int(np.random.randint(50,200))
        conn.execute("INSERT OR REPLACE INTO production VALUES (?,?,?,?,?,?,1)", (eid,month,ci,co,tr,round(min(100,(ci+co+tr)/4.0),1)))
    conn.commit(); conn.close()

def clear_sample():
    conn = get_db()
    for tb in ["guest_feedback","supervisor_eval","attendance","upselling","enrollments","production"]:
        conn.execute(f"DELETE FROM {tb} WHERE is_sample=1")
    conn.execute("DELETE FROM agents WHERE is_sample=1"); conn.commit(); conn.close()

# ── SCORING ──
def calc_guest_score(answers, overall):
    pts = 0; mx = 0
    for a in answers:
        v = ans_val(a)
        if v is not None: pts += v * 20; mx += 20
    pts += (overall / 5) * 20; mx += 20
    return round((pts / max(mx, 1)) * 100, 2)

def calc_sup_kpi(answers, overall, bonus):
    pts = 0
    for a in answers:
        v = ans_val(a)
        if v == 1.0: pts += 16
        elif v == 0.5: pts += 8
    pts += (overall / 5) * 20
    if ans_val(bonus) == 1.0: pts += 10
    return round(min(110, pts), 1)

WEIGHTS = {"Guest Experience": 0.20, "Supervisor": 0.15, "Attendance": 0.20, "Upselling": 0.15, "Enrollments": 0.15, "Production": 0.15}

def grade(s):
    if s >= 93: return ("Exceptional","متميز")[AR], "#16A34A"
    if s >= 85: return ("Excellent","ممتاز")[AR], "#2563EB"
    if s >= 75: return ("Good","جيد")[AR], "#D97706"
    if s >= 60: return ("Fair","مقبول")[AR], "#EA580C"
    return ("Needs Improvement","يحتاج تطوير")[AR], "#DC2626"

def calc_kpis(conn, month, inc_sample=False):
    sf = "" if inc_sample else "AND is_sample=0"
    af = "WHERE active=1" if inc_sample else "WHERE active=1 AND is_sample=0"
    agents = pd.read_sql(f"SELECT emp_id, name, position FROM agents {af} ORDER BY emp_id", conn)
    if len(agents) == 0: return pd.DataFrame()
    rows = []
    for _, ag in agents.iterrows():
        eid = ag["emp_id"]
        ci_c = pd.read_sql(f"SELECT score FROM guest_feedback WHERE emp_id=? AND month=? AND call_type='Check-In' {sf}", conn, params=(eid, month))
        co_c = pd.read_sql(f"SELECT score FROM guest_feedback WHERE emp_id=? AND month=? AND call_type='Check-Out' {sf}", conn, params=(eid, month))
        ci_a = float(ci_c["score"].astype(float).mean()) if len(ci_c)>0 else None
        co_a = float(co_c["score"].astype(float).mean()) if len(co_c)>0 else None
        if ci_a is not None and co_a is not None: gk = round((ci_a+co_a)/2,2)
        elif ci_a is not None: gk = round(ci_a,2)
        elif co_a is not None: gk = round(co_a,2)
        else: gk = None
        sup = pd.read_sql(f"SELECT kpi FROM supervisor_eval WHERE emp_id=? AND month=? {sf}", conn, params=(eid, month))
        sk = float(sup["kpi"].iloc[0]) if len(sup)>0 else None
        att = pd.read_sql(f"SELECT score FROM attendance WHERE emp_id=? AND month=? {sf}", conn, params=(eid, month))
        ak = float(att["score"].iloc[0]) if len(att)>0 else None
        ups = pd.read_sql(f"SELECT score FROM upselling WHERE emp_id=? AND month=? {sf}", conn, params=(eid, month))
        uk = float(ups["score"].iloc[0]) if len(ups)>0 else None
        enr = pd.read_sql(f"SELECT score FROM enrollments WHERE emp_id=? AND month=? {sf}", conn, params=(eid, month))
        ek = float(enr["score"].iloc[0]) if len(enr)>0 else None
        prod = pd.read_sql(f"SELECT score FROM production WHERE emp_id=? AND month=? {sf}", conn, params=(eid, month))
        pk = float(prod["score"].iloc[0]) if len(prod)>0 else None
        sc = {"Guest Experience":gk,"Supervisor":sk,"Attendance":ak,"Upselling":uk,"Enrollments":ek,"Production":pk}
        t=0; ws=0
        for k,v in sc.items():
            if v is not None: t+=v*WEIGHTS[k]; ws+=WEIGHTS[k]
        final = round(t/ws,1) if ws>0 else 0
        g, gc = grade(final)
        rows.append({"Emp ID":eid,"Name":ag["name"],"Position":ag["position"],
            "Check-In":round(ci_a,2) if ci_a else None,"Check-Out":round(co_a,2) if co_a else None,
            "Guest Experience (20%)":gk,"Supervisor (15%)":sk,"Attendance (20%)":ak,
            "Upselling (15%)":uk,"Enrollments (15%)":ek,"Production (15%)":pk,
            "Total KPI":final,"Grade":g})
    df = pd.DataFrame(rows)
    if len(df)>0: df = df.sort_values("Total KPI",ascending=False).reset_index(drop=True)
    return df

PIP_PRESETS = {
    "Guest Experience": "1. Review guest experience scoring rubric with GR Team.\n2. Shadow a top-scorer for 3 guest interactions.\n3. Practice greeting scripts (role-play 2x per week).\n4. Focus on explaining facilities proactively.",
    "Supervisor": "1. Weekly 15-min one-on-one with supervisor.\n2. Review SOPs for 3 most common procedures.\n3. Attend one cross-training session.\n4. Set 2 behavioral goals for next evaluation.",
    "Attendance": "1. Review attendance policy with HR.\n2. Set up personal reminder for shift start.\n3. Discuss barriers with supervisor.\n4. Target zero unexcused absences for 30 days.",
    "Upselling": "1. Review room category matrix and rate differences.\n2. Shadow top up-seller for 2 shifts.\n3. Practice 3 upselling scripts.\n4. Set daily upsell target (min 3 per shift).",
    "Enrollments": "1. Review loyalty program benefits.\n2. Practice 30-second enrollment pitch.\n3. Target 1 enrollment per shift.\n4. Track which guest segments convert best.",
    "Production": "1. Review Opera shortcuts for faster processing.\n2. Observe high-producer for full shift.\n3. Practice handling 3 simultaneous tasks.\n4. Discuss queue management with supervisor.",
}

# ── INIT ──
init_db(); load_sample()

# ── HELPERS ──
def get_real_agents():
    conn = get_db(); adf = pd.read_sql("SELECT emp_id, name FROM agents WHERE active=1 AND is_sample=0 ORDER BY name", conn); conn.close(); return adf

def agent_opt_list(adf):
    if len(adf)==0: return [tx("no_agents_placeholder")]
    return [f"{r['emp_id']} — {r['name']}" for _, r in adf.iterrows()]

# ── SIDEBAR (continued) ──
with st.sidebar:
    st.divider()
    st.markdown(f"**{tx('property_label')}**")
    hotel_name = st.text_input(tx("property_label"), value="", placeholder=tx("property_placeholder"), label_visibility="collapsed")
    st.divider()
    months = ["SAMPLE","April 2026","March 2026","February 2026","January 2026","December 2025","November 2025"]
    sel_month = st.selectbox(tx("month_label"), months)
    st.divider()
    if has_sample():
        st.caption(tx("sample_loaded"))
        if st.button(tx("remove_sample"), use_container_width=True): clear_sample(); st.rerun()
    else:
        if st.button(tx("load_sample"), use_container_width=True): load_sample(); st.rerun()
    st.divider()
    conn = get_db()
    n_real = conn.execute("SELECT COUNT(*) FROM agents WHERE active=1 AND is_sample=0").fetchone()[0]
    conn.close()
    st.metric(tx("your_agents"), n_real)

    # ── FOOTER ──
    st.markdown("""
    <div class="footer">
        <p>© 2026 <strong>Khalid Bin Nasban</strong></p>
        <p><a href="mailto:KNasban@gmail.com">KNasban@gmail.com</a></p>
        <p><a href="https://www.linkedin.com/in/khalid-nasban" target="_blank">LinkedIn Profile</a></p>
    </div>
    """, unsafe_allow_html=True)

# ── HEADER ──
dn = hotel_name if hotel_name.strip() else tx("your_property")
st.markdown(f'<div class="pms-hd"><h1>{tx("app_title")}</h1><span>{dn}</span></div>', unsafe_allow_html=True)

# ═══════════════════════════════════════
# 5 TABS
# ═══════════════════════════════════════
tab_guide, tab_dash, tab_perf, tab_agents, tab_coach = st.tabs([
    f"📖 {tx('tab_guide')}",
    f"📊 {tx('tab_dashboard')}",
    f"📝 {tx('tab_perf')}",
    f"👥 {tx('tab_agents')}",
    f"🎯 {tx('tab_coaching')}",
])

# ═══════════════════════════════════════
# GUIDE
# ═══════════════════════════════════════
with tab_guide:
    st.markdown(f"## {tx('guide_welcome')}")
    st.markdown(tx("guide_intro"))
    st.markdown("---")
    kpi_info = [
        ("kpi_guest","20%",("Voice of the guest via follow-up calls. Drives loyalty, reputation, TripAdvisor rankings.","تقييم تجربة الضيف عبر اتصالات المتابعة. يؤثر على الولاء والسمعة وتصنيف TripAdvisor.")),
        ("kpi_attendance","20%",("Presence and punctuality. No KPI matters if the agent isn't on the floor.","الحضور والالتزام. لا فائدة من أي مؤشر إذا الموظف مو موجود.")),
        ("kpi_upselling","15%",("Revenue from upgrades vs target. Direct RevPAR contribution.","إيرادات الترقيات مقابل الهدف. مساهمة مباشرة في RevPAR.")),
        ("kpi_enrollments","15%",("Loyalty sign-ups. Future direct bookings bypassing OTA commissions.","تسجيلات الولاء. حجوزات مستقبلية مباشرة بدون عمولة.")),
        ("kpi_supervisor","15%",("Monthly evaluation: grooming, professionalism, SOPs, teamwork, initiative.","تقييم شهري: المظهر والمهنية والإجراءات والعمل الجماعي والمبادرة.")),
        ("kpi_production","15%",("Check-ins, check-outs, transactions. Operational throughput.","تسجيلات الدخول والخروج والمعاملات. الإنتاجية التشغيلية.")),
    ]
    for key, w, descs in kpi_info:
        d = descs[1] if AR else descs[0]
        st.markdown(f'<div class="benefit"><strong>{tx(key)} — {w}</strong><p>{d}</p></div>', unsafe_allow_html=True)
    st.markdown("---")
    st.markdown(f"**{tx('guide_grading')}**")
    st.markdown(tx("guide_quickstart"))

# ═══════════════════════════════════════
# DASHBOARD
# ═══════════════════════════════════════
with tab_dash:
    conn = get_db(); inc = (sel_month=="SAMPLE"); kpi_df = calc_kpis(conn, sel_month, inc_sample=inc); conn.close()
    if len(kpi_df)==0 or kpi_df["Total KPI"].sum()==0:
        st.info(tx("no_data"))
    else:
        if inc: st.markdown(f'<div class="warn-banner"><p>{tx("sample_banner")}</p></div>', unsafe_allow_html=True)
        avg=kpi_df["Total KPI"].mean(); top=kpi_df.iloc[0]; exc=len(kpi_df[kpi_df["Grade"]==("متميز" if AR else "Exceptional")])
        c1,c2,c3,c4 = st.columns(4)
        c1.markdown(f'<div class="kc"><div class="lbl">{tx("team_avg")}</div><div class="val">{avg:.1f}</div><div class="sub">{len(kpi_df)}</div></div>', unsafe_allow_html=True)
        c2.markdown(f'<div class="kc"><div class="lbl">{tx("top_perf")}</div><div class="val" style="font-size:1rem">{top["Name"]}</div><div class="sub">{top["Total KPI"]} — {top["Grade"]}</div></div>', unsafe_allow_html=True)
        c3.markdown(f'<div class="kc"><div class="lbl">{tx("exceptional")}</div><div class="val" style="color:#16A34A">{exc}</div><div class="sub">{exc/len(kpi_df)*100:.0f}%</div></div>', unsafe_allow_html=True)
        c4.markdown(f'<div class="kc"><div class="lbl">{tx("period")}</div><div class="val" style="font-size:1rem">{sel_month}</div><div class="sub">{"Sample" if inc else "Live"}</div></div>', unsafe_allow_html=True)
        st.markdown("")
        col_ch, col_pi = st.columns([3,1])
        with col_ch:
            colors = {"Guest Experience (20%)":"#EF4444","Supervisor (15%)":"#8B5CF6","Attendance (20%)":"#3B82F6","Upselling (15%)":"#22C55E","Enrollments (15%)":"#F59E0B","Production (15%)":"#14B8A6"}
            fig = go.Figure()
            for col, clr in colors.items():
                vals=kpi_df[col].fillna(0); w=float(col.split("(")[1].replace("%)",""))/100
                fig.add_trace(go.Bar(name=col, x=kpi_df["Name"], y=vals*w, marker_color=clr))
            fig.update_layout(barmode="stack", paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                font=dict(family="Inter",color="#1E293B",size=11), xaxis=dict(gridcolor="#F1F5F9",tickangle=-45),
                yaxis=dict(gridcolor="#F1F5F9",title=tx("weighted_score")), margin=dict(l=20,r=20,t=30,b=80), height=420,
                legend=dict(orientation="h",y=-0.35,font=dict(size=10)))
            st.plotly_chart(fig, use_container_width=True)
        with col_pi:
            gdc=kpi_df["Grade"].value_counts().reset_index(); gdc.columns=["Grade","Count"]
            fig2=px.pie(gdc, names="Grade", values="Count", hole=0.5)
            fig2.update_layout(paper_bgcolor="rgba(0,0,0,0)", font=dict(family="Inter",color="#1E293B"),
                margin=dict(l=10,r=10,t=30,b=10), height=420, legend=dict(font=dict(size=9)))
            st.plotly_chart(fig2, use_container_width=True)
        st.dataframe(kpi_df, use_container_width=True, height=450)
        st.download_button(tx("export_csv"), kpi_df.to_csv(index=False), f"pms_{sel_month.replace(' ','_')}.csv", "text/csv")

# ═══════════════════════════════════════
# PERFORMANCE INPUT
# ═══════════════════════════════════════
with tab_perf:
    kpi_names = [f"⭐ {tx('kpi_guest')}", f"👔 {tx('kpi_supervisor')}", f"📋 {tx('kpi_attendance')}",
                 f"💰 {tx('kpi_upselling')}", f"🎯 {tx('kpi_enrollments')}", f"📈 {tx('kpi_production')}"]
    kpi_choice = st.selectbox(tx("select_kpi"), kpi_names, key="kpi_sel")
    st.markdown("---")
    adf = get_real_agents(); ao = agent_opt_list(adf); dis = len(adf)==0
    if dis: st.warning(tx("no_agents"))

    # ── GUEST EXPERIENCE ──
    if tx("kpi_guest") in kpi_choice:
        st.subheader(tx("ge_title"))
        st.caption(tx("ge_desc"))
        with st.form("gf_form", clear_on_submit=True):
            c1,c2,c3 = st.columns(3)
            with c1: fa = st.selectbox(tx("agent"), ao, disabled=dis)
            with c2: ft = st.selectbox(tx("interaction_type"), ["Check-In", "Check-Out"], disabled=dis)
            with c3: fm = st.selectbox(tx("month"), months[1:], key="gfm", disabled=dis)
            c4,c5,c6 = st.columns(3)
            with c4: gn = st.text_input(tx("guest_name"), "", disabled=dis)
            with c5: rm = st.text_input(tx("room"), "", disabled=dis)
            with c6: vip = st.text_input(tx("vip_tier"), "", disabled=dis)
            st.markdown("---")
            opts = ans_options()
            if ft == "Check-In":
                st.markdown(f"**{tx('checkin_qs')}**")
                q1=st.selectbox(f"1. {tx('ci_q1')}", opts, disabled=dis, key="ci1")
                q2=st.selectbox(f"2. {tx('ci_q2')}", opts, disabled=dis, key="ci2")
                q3=st.selectbox(f"3. {tx('ci_q3')}", opts, disabled=dis, key="ci3")
                q4=st.selectbox(f"4. {tx('ci_q4')}", opts, disabled=dis, key="ci4")
                q5=st.selectbox(f"5. {tx('ci_q5')}", opts, disabled=dis, key="ci5")
            else:
                st.markdown(f"**{tx('checkout_qs')}**")
                q1=st.selectbox(f"1. {tx('co_q1')}", opts, disabled=dis, key="co1")
                q2=st.selectbox(f"2. {tx('co_q2')}", opts, disabled=dis, key="co2")
                q3=st.selectbox(f"3. {tx('co_q3')}", opts, disabled=dis, key="co3")
                q4=st.selectbox(f"4. {tx('co_q4')}", opts, disabled=dis, key="co4")
                q5=st.selectbox(f"5. {tx('co_q5')}", opts, disabled=dis, key="co5")
            overall = st.slider(f"6. {tx('overall_rating')}", 1, 5, 3, disabled=dis, key="geov")
            comments = st.text_area(f"7. {tx('comments')}", "", disabled=dis, key="gecm")
            score = calc_guest_score([q1,q2,q3,q4,q5], overall)
            st.info(f"{tx('calculated_score')}: **{score}**")
            if st.form_submit_button(tx("submit"), type="primary", use_container_width=True, disabled=dis):
                eid=fa.split(" — ")[0]; conn=get_db()
                conn.execute("INSERT INTO guest_feedback (emp_id,month,call_type,guest_name,room,vip_tier,q1,q2,q3,q4,q5,overall_rating,comments,score,caller,is_sample) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)",
                    (eid,fm,ft,gn,rm,vip,q1,q2,q3,q4,q5,overall,comments,score,"GR Team"))
                conn.commit(); conn.close(); st.success(f"{tx('save')} — {fa}: {score}")
        st.divider()
        conn=get_db()
        sm=pd.read_sql("""SELECT a.name as Agent, gf.emp_id as ID,
            ROUND(AVG(CASE WHEN gf.call_type='Check-In' THEN CAST(gf.score AS REAL) END),2) as 'Check-In',
            ROUND(AVG(CASE WHEN gf.call_type='Check-Out' THEN CAST(gf.score AS REAL) END),2) as 'Check-Out',
            ROUND((COALESCE(AVG(CASE WHEN gf.call_type='Check-In' THEN CAST(gf.score AS REAL) END),0)+COALESCE(AVG(CASE WHEN gf.call_type='Check-Out' THEN CAST(gf.score AS REAL) END),0))/2,2) as KPI,
            COUNT(*) as Calls FROM guest_feedback gf JOIN agents a ON gf.emp_id=a.emp_id
            WHERE gf.month=? AND gf.is_sample=0 GROUP BY gf.emp_id ORDER BY KPI DESC""", conn, params=(sel_month,))
        conn.close()
        st.dataframe(sm if len(sm)>0 else pd.DataFrame(columns=["Agent","ID","Check-In","Check-Out","KPI","Calls"]), use_container_width=True, height=300)

    # ── SUPERVISOR ──
    elif tx("kpi_supervisor") in kpi_choice:
        st.subheader(tx("sup_title")); st.caption(tx("sup_desc"))
        with st.form("sup_form", clear_on_submit=True):
            c1,c2,c3=st.columns(3)
            with c1: sa=st.selectbox(tx("agent"),ao,key="sa",disabled=dis)
            with c2: sm2=st.selectbox(tx("month"),months[1:],key="sm2",disabled=dis)
            with c3: ev=st.text_input(tx("evaluator"),"",disabled=dis)
            st.markdown("---")
            sopts=sup_ans()
            sq1=st.selectbox(f"1. {tx('sq1')}",sopts,disabled=dis,key="sq1")
            sq2=st.selectbox(f"2. {tx('sq2')}",sopts,disabled=dis,key="sq2")
            sq3=st.selectbox(f"3. {tx('sq3')}",sopts,disabled=dis,key="sq3")
            sq4=st.selectbox(f"4. {tx('sq4')}",sopts,disabled=dis,key="sq4")
            sq5=st.selectbox(f"5. {tx('sq5')}",sopts,disabled=dis,key="sq5")
            sov=st.slider(f"6. {tx('overall_rating')}",1,5,3,disabled=dis,key="sov")
            sbn=st.selectbox(f"7. {tx('sq_bonus')}",ans_yn(),disabled=dis,key="sbn")
            sup_kpi=calc_sup_kpi([sq1,sq2,sq3,sq4,sq5],sov,sbn)
            st.info(f"KPI: **{sup_kpi}**")
            sn=st.text_area(tx("notes"),"",disabled=dis,key="sn")
            if st.form_submit_button(tx("save"),type="primary",use_container_width=True,disabled=dis):
                eid=sa.split(" — ")[0]; conn=get_db()
                conn.execute("INSERT OR REPLACE INTO supervisor_eval (emp_id,month,q1,q2,q3,q4,q5,overall_rating,bonus_task,kpi,evaluator,notes,is_sample) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0)",
                    (eid,sm2,sq1,sq2,sq3,sq4,sq5,sov,sbn,sup_kpi,ev,sn))
                conn.commit(); conn.close(); st.success(f"{tx('save')} — {sa}: {sup_kpi}")
        st.divider()
        conn=get_db()
        sd=pd.read_sql("SELECT a.name as Agent,se.emp_id as ID,se.kpi as KPI,se.evaluator as Evaluator FROM supervisor_eval se JOIN agents a ON se.emp_id=a.emp_id WHERE se.month=? AND se.is_sample=0 ORDER BY se.kpi DESC",conn,params=(sel_month,))
        conn.close()
        st.dataframe(sd if len(sd)>0 else pd.DataFrame(columns=["Agent","ID","KPI","Evaluator"]),use_container_width=True,height=300)

    # ── ATTENDANCE ──
    elif tx("kpi_attendance") in kpi_choice:
        st.subheader(tx("kpi_attendance")); st.caption(tx("att_desc"))
        with st.form("att_form"):
            c1,c2=st.columns(2)
            with c1: aa=st.selectbox(tx("agent"),ao,key="aa",disabled=dis)
            with c2: am=st.selectbox(tx("month"),months[1:],key="am",disabled=dis)
            c3,c4,c5,c6=st.columns(4)
            with c3: pr=st.number_input(tx("present"),0,31,24,disabled=dis)
            with c4: ab=st.number_input(tx("absent"),0,31,2,disabled=dis)
            with c5: lt=st.number_input(tx("late"),0,31,1,disabled=dis)
            with c6: lm=st.number_input(tx("late_min"),0,500,10,disabled=dis)
            asc=max(0,round(100-(ab*8)-(lm*0.3),1))
            st.info(f"{tx('score')}: **{asc}**")
            if st.form_submit_button(tx("save"),type="primary",use_container_width=True,disabled=dis):
                eid=aa.split(" — ")[0]; conn=get_db()
                conn.execute("INSERT OR REPLACE INTO attendance VALUES (?,?,?,?,?,?,?,0)",(eid,am,pr,ab,lt,lm,asc))
                conn.commit(); conn.close(); st.success(f"{tx('save')} — {aa}: {asc}")
        st.divider()
        conn=get_db()
        ad=pd.read_sql("SELECT a.name as Name,at.days_present as Present,at.days_absent as Absent,at.late_count as Late,at.late_minutes as Min,at.score as Score FROM attendance at JOIN agents a ON at.emp_id=a.emp_id WHERE at.month=? AND at.is_sample=0 ORDER BY at.score DESC",conn,params=(sel_month,))
        conn.close()
        st.dataframe(ad if len(ad)>0 else pd.DataFrame(columns=["Name","Present","Absent","Late","Min","Score"]),use_container_width=True,height=300)

    # ── UPSELLING ──
    elif tx("kpi_upselling") in kpi_choice:
        st.subheader(tx("kpi_upselling")); st.caption(tx("ups_desc"))
        with st.form("ups_form"):
            c1,c2=st.columns(2)
            with c1: ua=st.selectbox(tx("agent"),ao,key="ua",disabled=dis)
            with c2: um=st.selectbox(tx("month"),months[1:],key="um",disabled=dis)
            c3,c4,c5=st.columns(3)
            with c3: ut=st.number_input(tx("target_sar"),0,100000,8000,disabled=dis)
            with c4: uac=st.number_input(tx("actual_sar"),0,100000,6500,disabled=dis)
            with c5: uc=st.number_input(tx("upsells"),0,100,8,disabled=dis)
            us=round(min(100,(uac/max(ut,1))*100),1)
            st.info(f"{tx('score')}: **{us}**")
            if st.form_submit_button(tx("save"),type="primary",use_container_width=True,disabled=dis):
                eid=ua.split(" — ")[0]; conn=get_db()
                conn.execute("INSERT OR REPLACE INTO upselling VALUES (?,?,?,?,?,?,0)",(eid,um,ut,uac,uc,us))
                conn.commit(); conn.close(); st.success(f"{tx('save')} — {ua}: {us}")
        st.divider()
        conn=get_db()
        ud=pd.read_sql("SELECT a.name as Name,u.target as Target,u.actual as Actual,u.count as '#',u.score as Score FROM upselling u JOIN agents a ON u.emp_id=a.emp_id WHERE u.month=? AND u.is_sample=0 ORDER BY u.score DESC",conn,params=(sel_month,))
        conn.close()
        st.dataframe(ud if len(ud)>0 else pd.DataFrame(columns=["Name","Target","Actual","#","Score"]),use_container_width=True,height=300)

    # ── ENROLLMENTS ──
    elif tx("kpi_enrollments") in kpi_choice:
        st.subheader(tx("kpi_enrollments")); st.caption(tx("enr_desc"))
        with st.form("enr_form"):
            c1,c2=st.columns(2)
            with c1: ea=st.selectbox(tx("agent"),ao,key="ea",disabled=dis)
            with c2: em2=st.selectbox(tx("month"),months[1:],key="em2",disabled=dis)
            c3,c4=st.columns(2)
            with c3: et=st.number_input(tx("target"),0,50,10,disabled=dis)
            with c4: eac=st.number_input(tx("actual"),0,50,8,disabled=dis)
            es=round(min(120,(eac/max(et,1))*100),1)
            st.info(f"{tx('score')}: **{es}**")
            if st.form_submit_button(tx("save"),type="primary",use_container_width=True,disabled=dis):
                eid=ea.split(" — ")[0]; conn=get_db()
                conn.execute("INSERT OR REPLACE INTO enrollments VALUES (?,?,?,?,?,0)",(eid,em2,et,eac,es))
                conn.commit(); conn.close(); st.success(f"{tx('save')} — {ea}: {es}")
        st.divider()
        conn=get_db()
        ed=pd.read_sql("SELECT a.name as Name,e.target as Target,e.actual as Actual,e.score as Score FROM enrollments e JOIN agents a ON e.emp_id=a.emp_id WHERE e.month=? AND e.is_sample=0 ORDER BY e.score DESC",conn,params=(sel_month,))
        conn.close()
        st.dataframe(ed if len(ed)>0 else pd.DataFrame(columns=["Name","Target","Actual","Score"]),use_container_width=True,height=300)

    # ── PRODUCTION ──
    elif tx("kpi_production") in kpi_choice:
        st.subheader(tx("kpi_production")); st.caption(tx("prod_desc"))
        with st.form("prod_form"):
            c1,c2=st.columns(2)
            with c1: pa=st.selectbox(tx("agent"),ao,key="pa",disabled=dis)
            with c2: pm2=st.selectbox(tx("month"),months[1:],key="pm2",disabled=dis)
            c3,c4,c5=st.columns(3)
            with c3: pci=st.number_input(tx("checkins"),0,500,70,disabled=dis)
            with c4: pco=st.number_input(tx("checkouts"),0,500,55,disabled=dis)
            with c5: ptr=st.number_input(tx("transactions"),0,1000,120,disabled=dis)
            ps=round(min(100,(pci+pco+ptr)/4.0),1)
            st.info(f"{tx('score')}: **{ps}**")
            if st.form_submit_button(tx("save"),type="primary",use_container_width=True,disabled=dis):
                eid=pa.split(" — ")[0]; conn=get_db()
                conn.execute("INSERT OR REPLACE INTO production VALUES (?,?,?,?,?,?,0)",(eid,pm2,pci,pco,ptr,ps))
                conn.commit(); conn.close(); st.success(f"{tx('save')} — {pa}: {ps}")
        st.divider()
        conn=get_db()
        prd=pd.read_sql("SELECT a.name as Name,p.checkins as CI,p.checkouts as CO,p.transactions as Trans,p.score as Score FROM production p JOIN agents a ON p.emp_id=a.emp_id WHERE p.month=? AND p.is_sample=0 ORDER BY p.score DESC",conn,params=(sel_month,))
        conn.close()
        st.dataframe(prd if len(prd)>0 else pd.DataFrame(columns=["Name","CI","CO","Trans","Score"]),use_container_width=True,height=300)

# ═══════════════════════════════════════
# AGENTS & IMPORT
# ═══════════════════════════════════════
with tab_agents:
    a_sub, i_sub = st.tabs([f"👥 {tx('tab_agents_sub')}", f"📤 {tx('tab_import_sub')}"])

    with a_sub:
        st.subheader(tx("agent_mgmt"))
        conn = get_db()
        with st.form("add_ag", clear_on_submit=True):
            c1,c2,c3=st.columns(3)
            with c1: ni=st.text_input(tx("emp_id"),"")
            with c2: nn=st.text_input(tx("full_name"),"")
            with c3: np2=st.selectbox(tx("position"),["Agent","Senior Agent","Night Agent","Supervisor"])
            if st.form_submit_button(tx("add"),type="primary"):
                if ni.strip() and nn.strip():
                    try:
                        conn.execute("INSERT INTO agents (emp_id,name,position,is_sample) VALUES (?,?,?,0)",(ni.strip(),nn.strip(),np2))
                        conn.commit(); st.success(f"{tx('added')} {nn}."); st.rerun()
                    except sqlite3.IntegrityError: st.error(tx("id_exists"))
        st.divider()
        ra=pd.read_sql("SELECT emp_id as ID,name as Name,position as Position FROM agents WHERE active=1 AND is_sample=0 ORDER BY emp_id",conn)
        if len(ra)>0: st.dataframe(ra,use_container_width=True,height=300)
        else: st.caption(tx("no_agents_yet"))
        if has_sample():
            with st.expander(tx("sample_agents")):
                sa2=pd.read_sql("SELECT emp_id as ID,name as Name,position as Position FROM agents WHERE is_sample=1 ORDER BY emp_id",conn)
                st.dataframe(sa2,use_container_width=True,height=250)
        conn.close()

    with i_sub:
        st.subheader(tx("import_title")); st.caption(tx("import_desc"))
        conn=get_db()
        upm=st.selectbox(tx("import_into"),months[1:],key="upm")
        cg,cs=st.columns(2)
        with cg:
            st.markdown(f"**{tx('kpi_guest')}**")
            gf=st.file_uploader("xlsx",type=["xlsx"],key="gf_up",label_visibility="collapsed")
            if gf:
                gfd=pd.read_excel(gf); st.dataframe(gfd,height=180)
                if st.button(tx("import_btn_ge"),type="primary"):
                    n=0
                    for _,r in gfd.iterrows():
                        eid=str(int(r.iloc[1])) if pd.notna(r.iloc[1]) else None
                        ci=float(r.iloc[2]) if pd.notna(r.iloc[2]) else None
                        co=float(r.iloc[3]) if pd.notna(r.iloc[3]) else None
                        if eid:
                            if ci is not None: conn.execute("INSERT INTO guest_feedback (emp_id,month,call_type,guest_name,score,caller,is_sample) VALUES (?,?,?,?,?,?,0)",(eid,upm,"Check-In","Excel",ci,"Import"))
                            if co is not None: conn.execute("INSERT INTO guest_feedback (emp_id,month,call_type,guest_name,score,caller,is_sample) VALUES (?,?,?,?,?,?,0)",(eid,upm,"Check-Out","Excel",co,"Import"))
                            n+=1
                    conn.commit(); st.success(f"{tx('imported')} {n}.")
        with cs:
            st.markdown(f"**{tx('kpi_supervisor')}**")
            sf=st.file_uploader("xlsx",type=["xlsx"],key="sf_up",label_visibility="collapsed")
            if sf:
                sfd=pd.read_excel(sf); st.dataframe(sfd,height=180)
                if st.button(tx("import_btn_sup"),type="primary"):
                    n=0
                    for _,r in sfd.iterrows():
                        eid=str(int(r.iloc[1])) if pd.notna(r.iloc[1]) else None
                        kpi=float(r.iloc[2]) if pd.notna(r.iloc[2]) else None
                        if eid and kpi:
                            conn.execute("INSERT OR REPLACE INTO supervisor_eval (emp_id,month,kpi,evaluator,is_sample) VALUES (?,?,?,?,0)",(eid,upm,kpi,"Excel"))
                            n+=1
                    conn.commit(); st.success(f"{tx('imported')} {n}.")
        conn.close()

# ═══════════════════════════════════════
# COACHING
# ═══════════════════════════════════════
with tab_coach:
    st.subheader(tx("coach_title")); st.caption(tx("coach_desc"))
    conn=get_db(); inc=(sel_month=="SAMPLE"); kpi_df=calc_kpis(conn,sel_month,inc_sample=inc)
    if len(kpi_df)==0 or kpi_df["Total KPI"].sum()==0:
        st.info(tx("no_kpi_data"))
    else:
        kpi_cols={"Guest Experience (20%)":"Guest Experience","Supervisor (15%)":"Supervisor","Attendance (20%)":"Attendance","Upselling (15%)":"Upselling","Enrollments (15%)":"Enrollments","Production (15%)":"Production"}
        struggling=[]
        for _,row in kpi_df.iterrows():
            lc=None; lv=999
            for col,label in kpi_cols.items():
                v=row[col]
                if v is not None and v<lv: lv=v; lc=label
            if row["Total KPI"]<75 or lv<75:
                struggling.append({"Emp ID":row["Emp ID"],"Name":row["Name"],"Total KPI":row["Total KPI"],"Grade":row["Grade"],"Lowest KPI":lc,"Lowest Score":round(lv,1) if lv!=999 else None})
        if len(struggling)==0:
            st.success(tx("all_above"))
        else:
            st.markdown(f"**{len(struggling)} {tx('needs_coaching')}**")
            st.dataframe(pd.DataFrame(struggling),use_container_width=True,height=180)
            str_opts=[f"{s['Emp ID']} — {s['Name']} ({s['Lowest KPI']}: {s['Lowest Score']})" for s in struggling]
            selected=st.selectbox(tx("select_agent"),str_opts)
            if selected:
                sel_eid=selected.split(" — ")[0]
                sel_info=next(s for s in struggling if s["Emp ID"]==sel_eid)
                lowest=sel_info["Lowest KPI"] or "Guest Experience"
                preset=PIP_PRESETS.get(lowest,"1. Schedule meeting.\n2. Set targets.")
                st.markdown(f"**{tx('plan_for')}: {lowest}**")
                plan_text=st.text_area(tx("edit_plan"),preset,height=160)
                cb=st.text_input(tx("created_by"),"")
                if st.button(tx("save_plan"),type="primary",use_container_width=True):
                    conn.execute("INSERT INTO action_plans (emp_id,month,lowest_kpi,plan_text,created_by) VALUES (?,?,?,?,?)",(sel_eid,sel_month,lowest,plan_text,cb))
                    conn.commit(); st.success(f"{tx('saved_for')} {sel_info['Name']}.")
    st.divider()
    st.subheader(tx("saved_plans"))
    plans=pd.read_sql("SELECT ap.created_at as Date,a.name as Agent,ap.month as Month,ap.lowest_kpi as Focus,ap.plan_text as Plan,ap.created_by as 'By' FROM action_plans ap JOIN agents a ON ap.emp_id=a.emp_id ORDER BY ap.id DESC LIMIT 20",conn)
    st.dataframe(plans if len(plans)>0 else pd.DataFrame(columns=["Date","Agent","Month","Focus","Plan","By"]),use_container_width=True,height=250)
    conn.close()