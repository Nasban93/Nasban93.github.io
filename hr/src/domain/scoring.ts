/**
 * Generic scoring engine — knows nothing about specific KPIs.
 * Reads KpiDefinition config, dispatches to scoringMethods, computes final + grade.
 */

import type { KpiDefinition, Grade } from "./types";
import { GRADE_BANDS, COACHING_THRESHOLD } from "../config/gradeBands";
import {
  ratioVsTarget,
  deduction,
  weightedQuestionnaire,
  sumDivided,
  passthrough,
  type RatioVsTargetParams,
  type DeductionParams,
  type WeightedQuestionnaireParams,
  type SumDividedParams,
} from "./scoringMethods";

export interface RawKpiInput {
  kpiDefId: string;
  /** Flat key→value map; shape depends on the scoringMethod (see scoringMethods.ts) */
  inputs: Record<string, unknown>;
}

export interface KpiResult {
  kpiDefId: string;
  name: string;
  nameAr: string;
  score: number | null;
  weight: number;
  configVersion: string;
}

export interface ScoringResult {
  kpiResults: KpiResult[];
  finalScore: number;
  grade: Grade;
  isCoaching: boolean;
}

function applyMethod(def: KpiDefinition, inputs: Record<string, unknown>): number | null {
  const p = def.params;
  switch (def.scoringMethod) {
    case "ratioVsTarget":
      return ratioVsTarget(inputs as Record<string, number>, p as unknown as RatioVsTargetParams);

    case "deduction":
      return deduction(inputs as Record<string, number>, p as unknown as DeductionParams);

    case "weightedQuestionnaire": {
      const qi = inputs as {
        answers: Array<"yes" | "partial" | "no" | null>;
        overall: number;
        hasBonus?: boolean;
      };
      return weightedQuestionnaire(qi, p as unknown as WeightedQuestionnaireParams);
    }

    case "sumDivided":
      return sumDivided(inputs as Record<string, number>, p as unknown as SumDividedParams);

    case "passthrough":
      return passthrough(inputs as Record<string, number>);

    default:
      return null;
  }
}

/**
 * Compute scores for one employee in one period.
 * @param definitions Active KpiDefinitions for the department (from kpiConfig).
 * @param rawInputs   One entry per KPI present in this period.
 */
/**
 * Compute final KPI + grade from already-computed per-KPI scores.
 * Used by dashboards that read stored scores from seed.json instead of raw inputs.
 */
export function computeFromStoredScores(
  definitions: KpiDefinition[],
  storedScores: Array<{ kpiDefId: string; score: number | null }>
): ScoringResult {
  const scoreMap = new Map(storedScores.map((s) => [s.kpiDefId, s.score]));

  const kpiResults: KpiResult[] = definitions
    .filter((d) => d.active)
    .map((def) => ({
      kpiDefId: def.kpiDefId,
      name: def.name,
      nameAr: def.nameAr,
      score: scoreMap.get(def.kpiDefId) ?? null,
      weight: def.weight,
      configVersion: def.configVersion,
    }));

  let weightedSum = 0;
  let weightPresent = 0;
  for (const r of kpiResults) {
    if (r.score != null) {
      weightedSum += r.score * r.weight;
      weightPresent += r.weight;
    }
  }

  const finalScore =
    weightPresent > 0 ? Math.round((weightedSum / weightPresent) * 10) / 10 : 0;

  const grade: Grade =
    GRADE_BANDS.find((b) => finalScore >= b.minScore)?.grade ?? "Needs Improvement";

  const isCoaching =
    finalScore < COACHING_THRESHOLD ||
    kpiResults.some((r) => r.score != null && r.score < COACHING_THRESHOLD);

  return { kpiResults, finalScore, grade, isCoaching };
}

export function computeScores(
  definitions: KpiDefinition[],
  rawInputs: RawKpiInput[]
): ScoringResult {
  const inputMap = new Map(rawInputs.map((r) => [r.kpiDefId, r.inputs]));

  const kpiResults: KpiResult[] = definitions
    .filter((d) => d.active)
    .map((def) => {
      const inputs = inputMap.get(def.kpiDefId);
      const score = inputs != null ? applyMethod(def, inputs) : null;
      return {
        kpiDefId: def.kpiDefId,
        name: def.name,
        nameAr: def.nameAr,
        score,
        weight: def.weight,
        configVersion: def.configVersion,
      };
    });

  // final = Σ(score×weight) / Σ(weight present) — renormalizes for missing KPIs
  let weightedSum = 0;
  let weightPresent = 0;
  for (const r of kpiResults) {
    if (r.score != null) {
      weightedSum += r.score * r.weight;
      weightPresent += r.weight;
    }
  }

  const finalScore =
    weightPresent > 0 ? Math.round((weightedSum / weightPresent) * 10) / 10 : 0;

  const grade: Grade =
    GRADE_BANDS.find((b) => finalScore >= b.minScore)?.grade ?? "Needs Improvement";

  const isCoaching =
    finalScore < COACHING_THRESHOLD ||
    kpiResults.some((r) => r.score != null && r.score < COACHING_THRESHOLD);

  return { kpiResults, finalScore, grade, isCoaching };
}
