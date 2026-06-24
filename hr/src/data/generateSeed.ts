/**
 * Generates seed.json — deterministic synthetic data for HotelPulse demo.
 * All names are randomly generated for demonstration; any resemblance to real individuals is coincidental.
 * Run: npx tsx src/data/generateSeed.ts
 */

import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type {
  SeedData,
  Employee,
  Department,
  JobLevel,
  KpiScore,
  WorkforceSnapshot,
  ExitRecord,
} from "../domain/types.js";
import { KPI_DEFINITIONS } from "../config/kpiConfig.js";
import { computeScores, type RawKpiInput } from "../domain/scoring.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Deterministic PRNG (seeded) ──────────────────────────────────────────────
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(0xdeadbeef);
const rand = () => rng();
const randInt = (min: number, max: number) =>
  Math.floor(rand() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]!;
const pickN = <T>(arr: T[], n: number): T[] => {
  const copy = [...arr];
  const result: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(rand() * copy.length);
    result.push(copy.splice(idx, 1)[0]!);
  }
  return result;
};

// ── Name system ───────────────────────────────────────────────────────────────

interface NC { en: string; ar: string }   // name component

// Saudi given names — male (25)
const SAUDI_M: NC[] = [
  { en: "Abdullah",    ar: "عبدالله"   },
  { en: "Mohammed",    ar: "محمد"      },
  { en: "Ahmed",       ar: "أحمد"      },
  { en: "Khalid",      ar: "خالد"      },
  { en: "Faisal",      ar: "فيصل"      },
  { en: "Omar",        ar: "عمر"       },
  { en: "Ibrahim",     ar: "إبراهيم"   },
  { en: "Saud",        ar: "سعود"      },
  { en: "Bandar",      ar: "بندر"      },
  { en: "Turki",       ar: "تركي"      },
  { en: "Majed",       ar: "ماجد"      },
  { en: "Nasser",      ar: "ناصر"      },
  { en: "Hamad",       ar: "حمد"       },
  { en: "Nawaf",       ar: "نواف"      },
  { en: "Rakan",       ar: "ركان"      },
  { en: "Fahad",       ar: "فهد"       },
  { en: "Saleh",       ar: "صالح"      },
  { en: "Talal",       ar: "طلال"      },
  { en: "Abdulrahman", ar: "عبدالرحمن" },
  { en: "Sultan",      ar: "سلطان"     },
  { en: "Mishal",      ar: "مشعل"      },
  { en: "Yazeed",      ar: "يزيد"      },
  { en: "Saad",        ar: "سعد"       },
  { en: "Waleed",      ar: "وليد"      },
  { en: "Abdulaziz",   ar: "عبدالعزيز" },
];

// Saudi given names — female (20)
const SAUDI_F: NC[] = [
  { en: "Noura",   ar: "نورة"  },
  { en: "Sara",    ar: "سارة"  },
  { en: "Fatima",  ar: "فاطمة" },
  { en: "Maha",    ar: "مها"   },
  { en: "Reem",    ar: "ريم"   },
  { en: "Hanan",   ar: "حنان"  },
  { en: "Aisha",   ar: "عائشة" },
  { en: "Lina",    ar: "لينا"  },
  { en: "Hessa",   ar: "حصة"   },
  { en: "Dalal",   ar: "دلال"  },
  { en: "Mashael", ar: "مشاعل" },
  { en: "Nadia",   ar: "نادية" },
  { en: "Ghada",   ar: "غادة"  },
  { en: "Abeer",   ar: "عبير"  },
  { en: "Rawan",   ar: "روان"  },
  { en: "Lujain",  ar: "لجين"  },
  { en: "Shahad",  ar: "شهد"   },
  { en: "Mona",    ar: "منى"   },
  { en: "Hind",    ar: "هند"   },
  { en: "Lamya",   ar: "لمى"   },
];

// Saudi family / tribe names (16)
const SAUDI_FAM: NC[] = [
  { en: "Al-Qahtani",  ar: "القحطاني"  },
  { en: "Al-Otaibi",   ar: "العتيبي"   },
  { en: "Al-Ghamdi",   ar: "الغامدي"   },
  { en: "Al-Harbi",    ar: "الحربي"    },
  { en: "Al-Dosari",   ar: "الدوسري"   },
  { en: "Al-Shahrani", ar: "الشهراني"  },
  { en: "Al-Zahrani",  ar: "الزهراني"  },
  { en: "Al-Mutairi",  ar: "المطيري"   },
  { en: "Al-Shammari", ar: "الشمري"    },
  { en: "Al-Rashidi",  ar: "الرشيدي"   },
  { en: "Al-Maliki",   ar: "المالكي"   },
  { en: "Al-Anzi",     ar: "العنزي"    },
  { en: "Al-Subaie",   ar: "السبيعي"   },
  { en: "Al-Asmari",   ar: "الأسمري"   },
  { en: "Al-Bishi",    ar: "البيشي"    },
  { en: "Al-Qarni",    ar: "القرني"    },
];

// Expat pools — last-name arrays shared between M and F within each nationality
const EGY_L: NC[] = [
  { en: "Hassan",  ar: "حسن"     }, { en: "Ali",     ar: "علي"     },
  { en: "Ibrahim", ar: "إبراهيم" }, { en: "Samir",   ar: "سمير"    },
  { en: "Adel",    ar: "عادل"    }, { en: "Fathy",   ar: "فتحي"    },
  { en: "Ramadan", ar: "رمضان"   }, { en: "Kamal",   ar: "كمال"    },
  { en: "Nabil",   ar: "نبيل"    }, { en: "Fouad",   ar: "فؤاد"    },
];
const SUD_L: NC[] = [
  { en: "Abdallah", ar: "عبدالله" }, { en: "Mohammed", ar: "محمد"   },
  { en: "Ahmed",    ar: "أحمد"    }, { en: "Omer",     ar: "عمر"    },
  { en: "Hussein",  ar: "حسين"    }, { en: "Adam",     ar: "آدم"    },
];
const JOR_L: NC[] = [
  { en: "Khalil",  ar: "خليل"  }, { en: "Mansour", ar: "منصور" },
  { en: "Awad",    ar: "عواد"  }, { en: "Odeh",    ar: "عودة"  },
  { en: "Haddad",  ar: "حداد"  }, { en: "Qasem",   ar: "قاسم"  },
];
const FIL_L: NC[] = [
  { en: "Santos",    ar: "سانتوس"    }, { en: "Cruz",     ar: "كروز"     },
  { en: "Reyes",     ar: "رييس"      }, { en: "Fernandez",ar: "فيرنانديز" },
  { en: "Garcia",    ar: "غارسيا"    }, { en: "Dela Cruz", ar: "ديلا كروز"},
  { en: "Lopez",     ar: "لوبيز"     }, { en: "Ramos",    ar: "راموس"     },
  { en: "Aguilar",   ar: "أغيلار"    },
];
const IND_L: NC[] = [
  { en: "Kumar",  ar: "كومار" }, { en: "Patel",  ar: "باتيل" },
  { en: "Singh",  ar: "سينغ"  }, { en: "Sharma", ar: "شارما" },
  { en: "Nair",   ar: "ناير"  }, { en: "Verma",  ar: "فيرما" },
  { en: "Gupta",  ar: "غوبتا" }, { en: "Rao",    ar: "راو"   },
  { en: "Pillai", ar: "بيلاي" },
];
const PAK_L: NC[] = [
  { en: "Khan",     ar: "خان"    }, { en: "Malik",    ar: "مالك"   },
  { en: "Ahmed",    ar: "أحمد"   }, { en: "Ali",      ar: "علي"    },
  { en: "Iqbal",    ar: "إقبال"  }, { en: "Siddiqui", ar: "صديقي"  },
  { en: "Mirza",    ar: "ميرزا"  }, { en: "Chaudhry", ar: "تشودري" },
];

type GenderPool = { first: NC[]; last: NC[] };
type NatPool = { m: GenderPool; f: GenderPool };

const EXPAT: Record<string, NatPool> = {
  egyptian: {
    m: { first: [
      {en:"Mohamed",ar:"محمد"},{en:"Ahmed",ar:"أحمد"},{en:"Mahmoud",ar:"محمود"},
      {en:"Khaled",ar:"خالد"},{en:"Youssef",ar:"يوسف"},{en:"Amr",ar:"عمرو"},
      {en:"Sherif",ar:"شريف"},{en:"Tamer",ar:"تامر"},{en:"Mostafa",ar:"مصطفى"},
      {en:"Hossam",ar:"حسام"},
    ], last: EGY_L },
    f: { first: [
      {en:"Nour",ar:"نور"},{en:"Heba",ar:"هبة"},{en:"Dina",ar:"دينا"},
      {en:"Rana",ar:"رنا"},{en:"Rania",ar:"رانيا"},{en:"Eman",ar:"إيمان"},
      {en:"Mai",ar:"مي"},
    ], last: EGY_L },
  },
  sudanese: {
    m: { first: [
      {en:"Hassan",ar:"حسن"},{en:"Ibrahim",ar:"إبراهيم"},{en:"Kamal",ar:"كمال"},
      {en:"Salah",ar:"صلاح"},{en:"Adil",ar:"عادل"},{en:"Osman",ar:"عثمان"},
      {en:"Bakr",ar:"بكر"},{en:"Idris",ar:"إدريس"},
    ], last: SUD_L },
    f: { first: [
      {en:"Fatima",ar:"فاطمة"},{en:"Amira",ar:"أميرة"},
      {en:"Salma",ar:"سلمى"},{en:"Mariam",ar:"مريم"},
    ], last: SUD_L },
  },
  jordanian: {
    m: { first: [
      {en:"Ahmad",ar:"أحمد"},{en:"Tariq",ar:"طارق"},{en:"Samer",ar:"سامر"},
      {en:"Rami",ar:"رامي"},{en:"Basem",ar:"باسم"},{en:"Anas",ar:"أنس"},
      {en:"Nidal",ar:"نضال"},
    ], last: JOR_L },
    f: { first: [
      {en:"Lara",ar:"لارا"},{en:"Nadia",ar:"نادية"},
      {en:"Hala",ar:"هلا"},{en:"Rima",ar:"ريما"},
    ], last: JOR_L },
  },
  filipino: {
    m: { first: [
      {en:"Jose",ar:"خوسيه"},{en:"Ramon",ar:"رامون"},{en:"Eduardo",ar:"إدواردو"},
      {en:"Michael",ar:"مايكل"},{en:"Gilbert",ar:"جيلبرت"},{en:"Rodel",ar:"روديل"},
      {en:"Mark",ar:"مارك"},{en:"Ryan",ar:"رايان"},{en:"Dennis",ar:"دينيس"},
      {en:"Carlo",ar:"كارلو"},
    ], last: FIL_L },
    f: { first: [
      {en:"Maria",ar:"ماريا"},{en:"Ana",ar:"آنا"},{en:"Rose",ar:"روز"},
      {en:"Liza",ar:"ليزا"},{en:"Jenny",ar:"جيني"},{en:"Grace",ar:"غريس"},
      {en:"Maricel",ar:"ماريسيل"},{en:"Joanna",ar:"جوانا"},
    ], last: FIL_L },
  },
  indian: {
    m: { first: [
      {en:"Rajesh",ar:"راجيش"},{en:"Suresh",ar:"سوريش"},{en:"Ajay",ar:"أجاي"},
      {en:"Pradeep",ar:"براديب"},{en:"Dinesh",ar:"دينيش"},{en:"Ravi",ar:"رافي"},
      {en:"Sanjay",ar:"سانجاي"},{en:"Vikram",ar:"فيكرام"},{en:"Anil",ar:"أنيل"},
      {en:"Manoj",ar:"مانوج"},
    ], last: IND_L },
    f: { first: [
      {en:"Priya",ar:"بريا"},{en:"Anita",ar:"أنيتا"},{en:"Deepa",ar:"ديبا"},
      {en:"Kavitha",ar:"كافيتا"},{en:"Rekha",ar:"ريخا"},{en:"Sunita",ar:"سونيتا"},
    ], last: IND_L },
  },
  pakistani: {
    m: { first: [
      {en:"Muhammad",ar:"محمد"},{en:"Asif",ar:"عاصف"},{en:"Imran",ar:"عمران"},
      {en:"Tariq",ar:"طارق"},{en:"Zubair",ar:"زبير"},{en:"Usman",ar:"عثمان"},
      {en:"Farhan",ar:"فرحان"},{en:"Adnan",ar:"عدنان"},{en:"Bilal",ar:"بلال"},
      {en:"Waseem",ar:"وسيم"},
    ], last: PAK_L },
    f: { first: [
      {en:"Fatima",ar:"فاطمة"},{en:"Zainab",ar:"زينب"},
      {en:"Ayesha",ar:"عائشة"},{en:"Sana",ar:"سنا"},{en:"Nadia",ar:"نادية"},
    ], last: PAK_L },
  },
};

// Nationality weights for expat employees (hospitality mix in Saudi Arabia)
const NAT_WEIGHTS: [string, number][] = [
  ["filipino",  30],
  ["indian",    28],
  ["egyptian",  20],
  ["pakistani", 12],
  ["jordanian",  5],
  ["sudanese",   5],
];

function pickNat(): string {
  const total = NAT_WEIGHTS.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [nat, w] of NAT_WEIGHTS) {
    r -= w;
    if (r <= 0) return nat;
  }
  return NAT_WEIGHTS[0]![0];
}

interface BuiltName {
  en: string;        // short: "Abdullah Al-Qahtani"
  enLong: string;    // full:  "Abdullah Faisal Mohammed Al-Qahtani"
  enDisambig: string;// with father: "Abdullah Faisal Al-Qahtani"
  ar: string;        // short: "عبدالله القحطاني"
  arLong: string;    // full:  "عبدالله بن فيصل بن محمد القحطاني"
  arDisambig: string;// with father: "عبدالله بن فيصل القحطاني"
}

function buildSaudiName(gender: "M" | "F"): BuiltName {
  const first  = pick(gender === "M" ? SAUDI_M : SAUDI_F);
  const father = pick(SAUDI_M);
  const grand  = pick(SAUDI_M);
  const fam    = pick(SAUDI_FAM);

  return {
    en:         `${first.en} ${fam.en}`,
    enLong:     `${first.en} ${father.en} ${grand.en} ${fam.en}`,
    enDisambig: `${first.en} ${father.en} ${fam.en}`,
    ar:         `${first.ar} ${fam.ar}`,
    arLong:     `${first.ar} بن ${father.ar} بن ${grand.ar} ${fam.ar}`,
    arDisambig: `${first.ar} بن ${father.ar} ${fam.ar}`,
  };
}

function buildExpatName(gender: "M" | "F"): BuiltName {
  const nat  = pickNat();
  const pool = EXPAT[nat]![gender === "M" ? "m" : "f"]!;
  const first = pick(pool.first);
  const last  = pick(pool.last);
  const en = `${first.en} ${last.en}`;
  const ar = `${first.ar} ${last.ar}`;
  return { en, enLong: en, enDisambig: en, ar, arLong: ar, arDisambig: ar };
}

// ── Disambiguation pass ───────────────────────────────────────────────────────
function applyDisambiguation(employees: Employee[]): void {
  // EN
  const enBuckets = new Map<string, Employee[]>();
  for (const emp of employees) {
    const g = enBuckets.get(emp.fullName) ?? [];
    g.push(emp);
    enBuckets.set(emp.fullName, g);
  }
  for (const group of enBuckets.values()) {
    if (group.length > 1) {
      for (const emp of group) emp.displayName = emp.fullNameLong.split(" ").length >= 4
        ? (() => { const p = emp.fullNameLong.split(" "); return `${p[0]} ${p[1]} ${p[p.length - 1]}`; })()
        : `${emp.fullName} [${emp.employeeId}]`;
    }
  }

  // AR
  const arBuckets = new Map<string, Employee[]>();
  for (const emp of employees) {
    const g = arBuckets.get(emp.fullNameAr) ?? [];
    g.push(emp);
    arBuckets.set(emp.fullNameAr, g);
  }
  for (const group of arBuckets.values()) {
    if (group.length > 1) {
      for (const emp of group) emp.displayNameAr = emp.fullNameLongAr !== emp.fullNameAr
        ? emp.fullNameLongAr.replace(/^(\S+) بن (\S+) بن \S+ (.+)$/, "$1 بن $2 $3")
        : `${emp.fullNameAr} [${emp.employeeId}]`;
    }
  }
}

// ── Static reference data ─────────────────────────────────────────────────────

const DEPARTMENTS: Department[] = [
  {
    id: "front_office",
    name: "Front Office",
    nameAr: "مكتب الاستقبال",
    businessUnit: "Najd Crown — Riyadh",
    region: "Riyadh",
  },
  {
    id: "housekeeping",
    name: "Housekeeping",
    nameAr: "التدبير المنزلي",
    businessUnit: "Najd Crown — Riyadh",
    region: "Riyadh",
  },
];

const JOB_LEVELS: JobLevel[] = [
  { id: "L1", name: "Agent",         nameAr: "موظف",           salaryBandMin: 4000,  salaryBandMax: 6000  },
  { id: "L2", name: "Senior Agent",  nameAr: "موظف أول",       salaryBandMin: 6000,  salaryBandMax: 9000  },
  { id: "L3", name: "Night Agent",   nameAr: "موظف ليلي",      salaryBandMin: 5000,  salaryBandMax: 7500  },
  { id: "L4", name: "Supervisor",    nameAr: "مشرف",           salaryBandMin: 9000,  salaryBandMax: 14000 },
  { id: "L5", name: "Housekeeper",   nameAr: "عامل نظافة",     salaryBandMin: 3500,  salaryBandMax: 5500  },
  { id: "L6", name: "Senior HK",     nameAr: "عامل نظافة أول", salaryBandMin: 5000,  salaryBandMax: 7000  },
];

const FO_LEVELS = ["L1", "L2", "L3", "L4"];
const HK_LEVELS = ["L5", "L6", "L4"];

const FO_POSITIONS = [
  ["Guest Services Agent",    "موظف خدمات ضيوف"],
  ["Senior Front Desk Agent", "موظف أول استقبال"],
  ["Night Auditor",           "محاسب ليلي"],
  ["Front Office Supervisor", "مشرف مكتب الاستقبال"],
];
const HK_POSITIONS = [
  ["Room Attendant",          "عامل غرف"],
  ["Senior Room Attendant",   "عامل غرف أول"],
  ["Housekeeping Supervisor", "مشرف تدبير منزلي"],
  ["Laundry Attendant",       "عامل غسيل"],
];

const EXIT_REASONS = [
  "Resignation",
  "End of Contract",
  "Performance",
  "Personal Reasons",
  "Relocation",
];

const PERIODS = [
  "2025-11", "2025-12",
  "2026-01", "2026-02", "2026-03", "2026-04",
];

// ── Generate employees ────────────────────────────────────────────────────────
function makeEmployees(): Employee[] {
  const employees: Employee[] = [];
  let seq = 1;

  function addEmp(
    deptId: "front_office" | "housekeeping",
    gender: "M" | "F",
    nationality: "Saudi" | "Non-Saudi",
    levelIds: string[],
    positions: string[][]
  ) {
    const id = `EMP-${String(seq++).padStart(4, "0")}`;
    const levelId = pick(levelIds);
    const posEntry = pick(positions);

    const built = nationality === "Saudi"
      ? buildSaudiName(gender)
      : buildExpatName(gender);

    const tenureYears = rand() * 7 + 0.5;
    const hireYear = 2026 - Math.floor(tenureYears);
    const hireMonth = randInt(1, 12);

    employees.push({
      employeeId: id,
      fullName:       built.en,
      fullNameLong:   built.enLong,
      displayName:    built.en,        // may be overwritten by disambiguation pass
      fullNameAr:     built.ar,
      fullNameLongAr: built.arLong,
      displayNameAr:  built.ar,        // may be overwritten by disambiguation pass
      departmentId: deptId,
      jobLevelId: levelId,
      gender,
      nationality,
      age: randInt(22, 48),
      educationLevel: pick(["Bachelor", "Diploma", "High School", "Master"]),
      hireDate: `${hireYear}-${String(hireMonth).padStart(2, "0")}-01`,
      tenureYears: Math.round(tenureYears * 10) / 10,
      employmentStatus: "Active",
      sourceOfHire: pick(["Direct", "Agency", "Referral", "LinkedIn"]),
      position: posEntry[0]!,
      positionAr: posEntry[1]!,
    });
  }

  // Front Office: ~32 employees, ~55% Saudi, ~30% female
  for (let i = 0; i < 10; i++) addEmp("front_office", "M", "Saudi",     FO_LEVELS, FO_POSITIONS);
  for (let i = 0; i < 5;  i++) addEmp("front_office", "F", "Saudi",     FO_LEVELS, FO_POSITIONS);
  for (let i = 0; i < 3;  i++) addEmp("front_office", "M", "Saudi",     FO_LEVELS, FO_POSITIONS);
  for (let i = 0; i < 2;  i++) addEmp("front_office", "F", "Saudi",     FO_LEVELS, FO_POSITIONS);
  for (let i = 0; i < 9;  i++) addEmp("front_office", "M", "Non-Saudi", FO_LEVELS, FO_POSITIONS);
  for (let i = 0; i < 3;  i++) addEmp("front_office", "F", "Non-Saudi", FO_LEVELS, FO_POSITIONS);

  // Housekeeping: ~23 employees, ~55% Saudi, ~30% female
  for (let i = 0; i < 7;  i++) addEmp("housekeeping", "M", "Saudi",     HK_LEVELS, HK_POSITIONS);
  for (let i = 0; i < 3;  i++) addEmp("housekeeping", "F", "Saudi",     HK_LEVELS, HK_POSITIONS);
  for (let i = 0; i < 2;  i++) addEmp("housekeeping", "M", "Saudi",     HK_LEVELS, HK_POSITIONS);
  for (let i = 0; i < 8;  i++) addEmp("housekeeping", "M", "Non-Saudi", HK_LEVELS, HK_POSITIONS);
  for (let i = 0; i < 3;  i++) addEmp("housekeeping", "F", "Non-Saudi", HK_LEVELS, HK_POSITIONS);

  applyDisambiguation(employees);
  return employees;
}

// ── Generate KPI scores ───────────────────────────────────────────────────────
function makeRawInputs(
  deptId: "front_office" | "housekeeping",
  periodIndex: number,
  isStruggler: boolean
): RawKpiInput[] {
  const trend = periodIndex * 2;
  const base = isStruggler ? 55 : 78;
  const noise = () => (rand() - 0.5) * 22;

  if (deptId === "front_office") {
    const ge_score  = Math.min(100, Math.max(30, base + trend + noise()));
    const sup_score = Math.min(110, Math.max(40, base + 5 + trend + noise()));
    const att_absent = isStruggler ? randInt(2, 6) : randInt(0, 2);
    const att_late   = isStruggler ? randInt(20, 90) : randInt(0, 30);
    const ups_target = pick([5000, 8000, 10000]);
    const ups_actual = Math.round(ups_target * (isStruggler ? rand() * 0.6 + 0.3 : rand() * 0.5 + 0.7));
    const enr_target = pick([8, 10, 12]);
    const enr_actual = Math.round(enr_target * (isStruggler ? rand() * 0.6 + 0.3 : rand() * 0.6 + 0.7));
    const ci = randInt(40, 120);
    const co = randInt(30, 100);
    const tr = randInt(50, 200);

    return [
      { kpiDefId: "fo_guest_experience", inputs: {
        answers: makeAnswers(ge_score),
        overall: Math.min(5, Math.max(1, Math.round(ge_score / 20))),
        hasBonus: false,
      }},
      { kpiDefId: "fo_supervisor", inputs: {
        answers: makeAnswers(sup_score),
        overall: Math.min(5, Math.max(1, Math.round(sup_score / 22))),
        hasBonus: rand() > 0.6,
      }},
      { kpiDefId: "fo_attendance",  inputs: { absentDays: att_absent, lateMinutes: att_late } },
      { kpiDefId: "fo_upselling",   inputs: { actual: ups_actual, target: ups_target } },
      { kpiDefId: "fo_enrollments", inputs: { actual: enr_actual, target: enr_target } },
      { kpiDefId: "fo_production",  inputs: { checkIns: ci, checkOuts: co, transactions: tr } },
    ];
  } else {
    const rq          = Math.min(100, Math.max(30, base + trend + noise()));
    const prod_target = randInt(25, 40);
    const prod_actual = Math.round(prod_target * (isStruggler ? rand() * 0.5 + 0.4 : rand() * 0.4 + 0.7));
    const att_absent  = isStruggler ? randInt(2, 5)  : randInt(0, 2);
    const att_late    = isStruggler ? randInt(20, 80) : randInt(0, 25);
    const sup_score   = Math.min(100, Math.max(40, base + 5 + trend + noise()));

    return [
      { kpiDefId: "hk_room_quality", inputs: { value: Math.round(rq * 10) / 10 } },
      { kpiDefId: "hk_productivity", inputs: { actual: prod_actual, target: prod_target } },
      { kpiDefId: "hk_attendance",   inputs: { absentDays: att_absent, lateMinutes: att_late } },
      { kpiDefId: "hk_supervisor",   inputs: {
        answers: makeAnswers(sup_score),
        overall: Math.min(5, Math.max(1, Math.round(sup_score / 20))),
        hasBonus: false,
      }},
    ];
  }
}

function makeAnswers(targetScore: number): Array<"yes" | "partial" | "no" | null> {
  const ratio = Math.min(1, targetScore / 100);
  return Array.from({ length: 5 }, () => {
    const r = rand();
    if (r < ratio * 0.85) return "yes";
    if (r < ratio * 0.85 + 0.1) return "partial";
    return "no";
  });
}

// ── Main generation ───────────────────────────────────────────────────────────
function generate(): SeedData {
  const employees = makeEmployees();
  const activeIds = employees.map((e) => e.employeeId);

  const strugglerIds = new Set(pickN(activeIds, 6));
  const exitCandidates = pickN(activeIds.filter((id) => !strugglerIds.has(id)), 6);

  const kpiScores: KpiScore[] = [];
  const workforceSnapshots: WorkforceSnapshot[] = [];
  const exitRecords: ExitRecord[] = [];

  const exitSchedule = new Map<string, string[]>();
  exitCandidates.forEach((eid, i) => {
    const period = PERIODS[i % (PERIODS.length - 1)]!;
    if (!exitSchedule.has(period)) exitSchedule.set(period, []);
    exitSchedule.get(period)!.push(eid);
  });

  const terminatedAfter = new Map<string, string>();
  for (const [period, eids] of exitSchedule) {
    for (const eid of eids) terminatedAfter.set(eid, period);
  }

  const nitaqatBand = "Green" as const;

  for (let pi = 0; pi < PERIODS.length; pi++) {
    const period = PERIODS[pi]!;

    for (const emp of employees) {
      const terminatedPeriod = terminatedAfter.get(emp.employeeId);
      const isTerminatedByNow =
        terminatedPeriod != null && PERIODS.indexOf(terminatedPeriod) < pi;

      if (isTerminatedByNow) continue;

      const isStruggler = strugglerIds.has(emp.employeeId);
      const deptKpis = KPI_DEFINITIONS.filter(
        (k) => k.departmentId === emp.departmentId && k.active
      );
      const rawInputs = makeRawInputs(emp.departmentId, pi, isStruggler);
      const result = computeScores(deptKpis, rawInputs);

      for (const kr of result.kpiResults) {
        kpiScores.push({
          employeeId: emp.employeeId,
          period,
          kpiDefId: kr.kpiDefId,
          rawValue: kr.score,
          score: kr.score,
          configVersion: deptKpis.find((d) => d.kpiDefId === kr.kpiDefId)?.configVersion ?? "2026-01",
        });
      }

      const level = JOB_LEVELS.find((l) => l.id === emp.jobLevelId)!;
      const salary = Math.round(
        level.salaryBandMin + rand() * (level.salaryBandMax - level.salaryBandMin)
      );
      workforceSnapshots.push({
        employeeId: emp.employeeId,
        period,
        nitaqatBand,
        monthlySalary: salary,
        performanceRating: result.finalScore,
        trainingHoursYtd: Math.round(rand() * 40 + 5),
      });

      if (terminatedPeriod === period) {
        emp.employmentStatus = "Terminated";
        exitRecords.push({
          employeeId: emp.employeeId,
          terminationDate: `${period}-28`,
          terminationReason: pick(EXIT_REASONS),
          tenureAtExit: emp.tenureYears,
          period,
        });
      }
    }
  }

  return {
    isDemo: true,
    generatedAt: "2026-06-23T00:00:00Z",
    departments: DEPARTMENTS,
    jobLevels: JOB_LEVELS,
    employees,
    kpiScores,
    workforceSnapshots,
    exitRecords,
  };
}

// ── Write output ──────────────────────────────────────────────────────────────
const data = generate();
const outPath = join(__dirname, "seed.json");
writeFileSync(outPath, JSON.stringify(data, null, 2));

const active = data.employees.filter((e) => e.employmentStatus === "Active").length;
const saudi  = data.employees.filter((e) => e.nationality === "Saudi" && e.employmentStatus === "Active").length;
const disambig = data.employees.filter((e) => e.displayName !== e.fullName).length;

console.log(`Generated seed.json`);
console.log(`  Employees  : ${data.employees.length} (${active} active, ${data.employees.length - active} terminated)`);
console.log(`  Saudi      : ${saudi}/${active} = ${Math.round((saudi / active) * 100)}%`);
console.log(`  Disambig   : ${disambig} employees needed longer display name`);
console.log(`  KPI scores : ${data.kpiScores.length}`);
console.log(`  Snapshots  : ${data.workforceSnapshots.length}`);
console.log(`  Exits      : ${data.exitRecords.length}`);
