export type DeptId = "front_office" | "housekeeping";
export type Grade = "Exceptional" | "Excellent" | "Good" | "Fair" | "Needs Improvement";

export interface Department {
  id: DeptId;
  name: string;
  nameAr: string;
  businessUnit: string;
  region: string;
}

export interface JobLevel {
  id: string;
  name: string;
  nameAr: string;
  salaryBandMin: number;
  salaryBandMax: number;
}

export interface CasualVendor {
  id: string;
  name: string;
  nameAr: string;
  country: string;
}

export interface Employee {
  employeeId: string;
  /** Short EN display: "Abdullah Al-Qahtani" / "Maria Santos" */
  fullName: string;
  /** Four-part EN: "Abdullah Faisal Mohammed Al-Qahtani" (= fullName for expats) */
  fullNameLong: string;
  /** EN name for tables — adds father given name when another employee shares fullName */
  displayName: string;
  /** Short AR display: "عبدالله القحطاني" */
  fullNameAr: string;
  /** Four-part AR: "عبدالله بن فيصل بن محمد القحطاني" (= fullNameAr for expats) */
  fullNameLongAr: string;
  /** AR name for tables — disambiguated form when needed */
  displayNameAr: string;
  departmentId: DeptId;
  jobLevelId: string;
  gender: "M" | "F";
  nationality: "Saudi" | "Non-Saudi";
  age: number;
  educationLevel: string;
  hireDate: string;
  tenureYears: number;
  employmentStatus: "Active" | "Terminated";
  sourceOfHire: string;
  position: string;
  positionAr: string;
  /** "direct" = hotel payroll; "casual" = third-party vendor, excluded from Nitaqat */
  staffType: "direct" | "casual";
  vendorId?: string;
}

export type ScoringMethod =
  | "ratioVsTarget"
  | "deduction"
  | "weightedQuestionnaire"
  | "sumDivided"
  | "passthrough";

export interface KpiDefinition {
  kpiDefId: string;
  departmentId: DeptId;
  name: string;
  nameAr: string;
  weight: number;
  maxScore: number;
  scoringMethod: ScoringMethod;
  params: Record<string, unknown>;
  active: boolean;
  configVersion: string;
}

export interface KpiScore {
  employeeId: string;
  period: string;
  kpiDefId: string;
  rawValue: number | null;
  score: number | null;
  configVersion: string;
}

export interface WorkforceSnapshot {
  employeeId: string;
  period: string;
  nitaqatBand: "Red" | "Yellow" | "Green" | "Platinum";
  monthlySalary: number;
  performanceRating: number | null;
  trainingHoursYtd: number;
}

export interface ExitRecord {
  employeeId: string;
  terminationDate: string;
  terminationReason: string;
  tenureAtExit: number;
  period: string;
}

export interface ActionPlan {
  employeeId: string;
  period: string;
  lowestKpi: string;
  planText: string;
  createdBy: string;
}

export interface SeedData {
  isDemo: true;
  generatedAt: string;
  departments: Department[];
  jobLevels: JobLevel[];
  employees: Employee[];
  vendors: CasualVendor[];
  kpiScores: KpiScore[];
  workforceSnapshots: WorkforceSnapshot[];
  exitRecords: ExitRecord[];
}
