import type { ReactNode } from "react";

interface Props {
  title: string;
  children: ReactNode;
  className?: string;
}

export function ChartFrame({ title, children, className = "" }: Props) {
  return (
    <div className={`card p-5 surface-transition ${className}`}>
      <div
        className="text-xs font-semibold uppercase tracking-widest mb-4"
        style={{ color: "var(--text-muted)" }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}
