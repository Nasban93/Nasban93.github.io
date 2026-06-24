/**
 * Generic parameterized scoring functions — the ONLY place formulas live.
 * Each function takes raw inputs + method-specific params and returns a score.
 */

export interface RatioVsTargetParams {
  cap: number;
}

export interface DeductionPenalty {
  field: string;
  factor: number;
}

export interface DeductionParams {
  base: number;
  floor: number;
  penalties: DeductionPenalty[];
}

export interface WeightedQuestionnaireParams {
  yes: number;
  partial: number;
  no: number;
  overallWeight: number;
  cap: number;
  bonus?: number;
}

export interface SumDividedParams {
  fields: string[];
  divisor: number;
  cap: number;
}

/** min(cap, actual/target × 100) */
export function ratioVsTarget(
  inputs: Record<string, number>,
  params: RatioVsTargetParams
): number {
  const actual = inputs["actual"] ?? 0;
  const target = inputs["target"] ?? 0;
  if (target === 0) return 0;
  return Math.round(Math.min(params.cap, (actual / target) * 100) * 10) / 10;
}

/** max(floor, base − Σ(penalty.factor × input[penalty.field])) */
export function deduction(
  inputs: Record<string, number>,
  params: DeductionParams
): number {
  let total = params.base;
  for (const penalty of params.penalties) {
    total -= penalty.factor * (inputs[penalty.field] ?? 0);
  }
  return Math.round(Math.max(params.floor, total) * 10) / 10;
}

/**
 * Σ(answer→points) + (overall/5)×overallWeight (+bonus?), then min(cap, …)
 * answers: array of "yes" | "partial" | "no" | null (null = N/A, excluded from max)
 */
export function weightedQuestionnaire(
  inputs: {
    answers: Array<"yes" | "partial" | "no" | null>;
    overall: number;
    hasBonus?: boolean;
  },
  params: WeightedQuestionnaireParams
): number {
  let pts = 0;
  let mx = 0;
  for (const a of inputs.answers) {
    if (a === null) continue;
    if (a === "yes") pts += params.yes;
    else if (a === "partial") pts += params.partial;
    else pts += params.no;
    mx += params.yes;
  }
  pts += (inputs.overall / 5) * params.overallWeight;
  mx += params.overallWeight;
  if (inputs.hasBonus && params.bonus != null) {
    pts += params.bonus;
  }
  if (mx === 0) return 0;
  return Math.round(Math.min(params.cap, (pts / mx) * 100) * 100) / 100;
}

/**
 * Guest Experience variant: scores each form individually as points/max × 100,
 * then averages check-in mean and check-out mean.
 * answers: array of "yes"|"partial"|"no"|null, overall: 1-5
 */
export function guestExperienceForm(
  inputs: {
    answers: Array<"yes" | "partial" | "no" | null>;
    overall: number;
  },
  params: { yes: number; partial: number; no: number; overallWeight: number; cap: number }
): number {
  let pts = 0;
  let mx = 0;
  for (const a of inputs.answers) {
    if (a === null) continue;
    if (a === "yes") pts += params.yes;
    else if (a === "partial") pts += params.partial;
    else pts += params.no;
    mx += params.yes;
  }
  pts += (inputs.overall / 5) * params.overallWeight;
  mx += params.overallWeight;
  if (mx === 0) return 0;
  return Math.round((pts / mx) * 100 * 100) / 100;
}

/** min(cap, Σ(input[fields]) / divisor) */
export function sumDivided(
  inputs: Record<string, number>,
  params: SumDividedParams
): number {
  const total = params.fields.reduce((s, f) => s + (inputs[f] ?? 0), 0);
  return Math.round(Math.min(params.cap, total / params.divisor) * 10) / 10;
}

/** rawValue is already a 0..maxScore — pass through unchanged */
export function passthrough(inputs: Record<string, number>): number {
  return inputs["value"] ?? 0;
}
