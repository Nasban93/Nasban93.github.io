interface Props {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}

export function StatCard({ label, value, sub, accent }: Props) {
  return (
    <div
      className="card p-5 flex flex-col gap-1.5 surface-transition"
    >
      <div
        className="text-xs uppercase tracking-widest font-semibold"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </div>
      <div
        className="text-2xl font-bold leading-none"
        style={{ color: accent ?? "var(--text)" }}
      >
        {value}
      </div>
      {sub && (
        <div className="text-xs" style={{ color: "var(--text-faint)" }}>
          {sub}
        </div>
      )}
    </div>
  );
}
