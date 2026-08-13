import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const styles =
    status === "Approved"
      ? "bg-success/12 text-success border-success/25"
      : status === "Declined"
        ? "bg-destructive/12 text-destructive border-destructive/25"
        : "bg-warning/15 text-warning-foreground border-warning/35";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        styles,
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
