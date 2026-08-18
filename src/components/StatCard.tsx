import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "default",
  className,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  hint?: string;
  tone?: "default" | "primary" | "success" | "warning" | "destructive";
  className?: string;
}) {
  const toneRing =
    tone === "primary"
      ? "bg-primary text-primary-foreground"
      : tone === "success"
        ? "bg-success/12 text-success"
        : tone === "warning"
          ? "bg-warning/18 text-warning-foreground"
          : tone === "destructive"
            ? "bg-destructive/12 text-destructive"
            : "bg-accent text-accent-foreground";

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-3.5 shadow-card transition-shadow hover:shadow-elevated sm:p-5",
        className,
      )}
    >
      {/* Icon stays on the same row as the text at every width so the card reads
          as a compact horizontal tile on phones instead of a tall stacked block. */}
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground sm:text-[11px] sm:tracking-[0.12em]">
            {label}
          </p>
          <p className="stat-figure mt-1.5 truncate text-lg font-bold text-foreground sm:mt-2 sm:text-2xl">
            {value}
          </p>
          {hint ? (
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground sm:mt-1 sm:text-xs">
              {hint}
            </p>
          ) : null}
        </div>
        {Icon ? (
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 sm:rounded-xl",
              toneRing,
            )}
          >
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </span>
        ) : null}
      </div>
    </div>
  );
}
