/** CSS variable references — works in both light and dark themes */
export const tokens = {
  bg:        "var(--bg)",
  surface:   "var(--surface)",
  surface2:  "var(--surface-2)",
  border:    "var(--border)",
  text:      "var(--text)",
  muted:     "var(--text-muted)",
  faint:     "var(--text-faint)",
  gold:      "var(--gold)",
  goldBg:    "var(--gold-bg)",
  navy:      "var(--navy)",

  /** Hardcoded — same in both themes */
  exceptional: "#16A34A",
  excellent:   "#2563EB",
  good:        "#D97706",
  fair:        "#EA580C",
  poor:        "#DC2626",
  blue:        "#2563EB",

  kpiColors: [
    "#C9A227", "#2563EB", "#16A34A", "#8B5CF6", "#EC4899", "#14B8A6",
  ],
} as const;

export const gradeColor = (grade: string): string => {
  switch (grade) {
    case "Exceptional":       return "#16A34A";
    case "Excellent":         return "#2563EB";
    case "Good":              return "#D97706";
    case "Fair":              return "#EA580C";
    case "Needs Improvement": return "#DC2626";
    default:                  return "#94A3B8";
  }
};

export const nitaqatColor = (band: string): string => {
  switch (band) {
    case "Platinum": return "#16A34A";
    case "Green":    return "#16A34A";
    case "Yellow":   return "#D97706";
    case "Red":      return "#DC2626";
    default:         return "#94A3B8";
  }
};
