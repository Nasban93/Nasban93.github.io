import type { Grade } from "../domain/types";

export interface GradeBand {
  grade: Grade;
  minScore: number;
  color: string;
  colorAr: string;
}

export const GRADE_BANDS: GradeBand[] = [
  { grade: "Exceptional",        minScore: 93, color: "#16A34A", colorAr: "متميز" },
  { grade: "Excellent",          minScore: 85, color: "#2563EB", colorAr: "ممتاز" },
  { grade: "Good",               minScore: 75, color: "#D97706", colorAr: "جيد" },
  { grade: "Fair",               minScore: 60, color: "#EA580C", colorAr: "مقبول" },
  { grade: "Needs Improvement",  minScore: 0,  color: "#DC2626", colorAr: "يحتاج تطوير" },
];

export const COACHING_THRESHOLD = 75;

export function getGrade(score: number): Grade {
  for (const band of GRADE_BANDS) {
    if (score >= band.minScore) return band.grade;
  }
  return "Needs Improvement";
}

export function getGradeColor(grade: Grade): string {
  return GRADE_BANDS.find((b) => b.grade === grade)?.color ?? "#DC2626";
}
