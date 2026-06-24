export const en = {
  brand: "HotelPulse",
  hotelName: "Najd Crown Hotel & Residences",
  demoBanner: "Synthetic Demo Data — No real PII",

  // Nav / roles
  roleLabel: "View as",
  roleExec: "Executive",
  roleHR: "HR Manager",
  roleDeptHead: "Department Head",
  roleEmployee: "Employee Self-Service",

  // Common
  period: "Period",
  department: "Department",
  all: "All",
  employee: "Employee",
  name: "Name",
  grade: "Grade",
  score: "Score",
  finalKpi: "Final KPI",
  weight: "Weight",
  rank: "Rank",
  status: "Status",
  nationality: "Nationality",
  gender: "Gender",
  active: "Active",
  terminated: "Terminated",
  saudi: "Saudi",
  nonSaudi: "Non-Saudi",
  male: "Male",
  female: "Female",
  search: "Search employees…",

  // Grades
  exceptional: "Exceptional",
  excellent: "Excellent",
  good: "Good",
  fair: "Fair",
  needsImprovement: "Needs Improvement",

  // KPI names
  guestExperience: "Guest Experience",
  supervisor: "Supervisor",
  attendance: "Attendance",
  upselling: "Upselling",
  enrollments: "Enrollments",
  production: "Production",
  roomQuality: "Room Quality",
  productivity: "Productivity",

  // Executive
  headcount: "Headcount",
  saudization: "Saudization",
  nitaqat: "Nitaqat",
  femaleRep: "Female Representation",
  attrition: "Attrition Rate",
  avgPerformance: "Avg Performance",
  avgTraining: "Avg Training Hrs",
  hiresVsExits: "Hires vs Exits",
  kpiTrend: "KPI Trend",

  // HR Manager
  gradeDistribution: "Grade Distribution",
  coachingLoad: "Coaching Load",
  avgKpiByDept: "Avg KPI by Department",
  turnover: "Turnover & Exit Reasons",
  trainingCompletion: "Training Hours YTD",

  // Dept Head
  teamRanking: "Team Ranking",
  coachingQueue: "Coaching Queue",
  kpiBreakdown: "KPI Breakdown",
  pipPlan: "Improvement Plan",
  noCoaching: "All team members are above 75% — no coaching needed.",
  belowThreshold: "Below threshold",

  // Employee Self
  myKpiTrend: "My KPI Trend",
  myKpiRadar: "My KPI vs Team Avg",
  myActionPlan: "My Action Plan",
  selectEmployee: "Select an employee",

  // Months
  months: {
    "2025-11": "Nov 2025",
    "2025-12": "Dec 2025",
    "2026-01": "Jan 2026",
    "2026-02": "Feb 2026",
    "2026-03": "Mar 2026",
    "2026-04": "Apr 2026",
  } as Record<string, string>,
};

export type Translations = typeof en;
