import { gradeColor } from "../theme/tokens";
import { useT } from "../i18n/useT";
import type { Grade } from "../domain/types";

interface Props {
  grade: Grade;
  size?: "sm" | "md";
}

const gradeKey: Record<Grade, keyof ReturnType<typeof useT>> = {
  Exceptional: "exceptional",
  Excellent: "excellent",
  Good: "good",
  Fair: "fair",
  "Needs Improvement": "needsImprovement",
};

export function GradeBadge({ grade, size = "md" }: Props) {
  const t = useT();
  const color = gradeColor(grade);
  const key = gradeKey[grade];
  const label = t[key] as string;

  return (
    <span
      className={size === "sm"
        ? "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
        : "inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold"}
      style={{
        backgroundColor: `${color}18`,
        color,
        border: `1px solid ${color}40`,
      }}
    >
      {label}
    </span>
  );
}
