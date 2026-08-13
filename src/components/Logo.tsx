import CGSLOGO from "../assets/CGSLOGO.png";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  variant = "dark",
}: {
  className?: string;
  variant?: "dark" | "light";
}) {
  return (
    <img
      src={CGSLOGO}
      alt="Corporate Gifting Solution logo"
      className={cn(
        "h-10 w-auto object-contain",
        // The lockup has dark text, so on the deep-blue sidebar it is knocked out to white.
        variant === "light" && "brightness-0 invert",
        className,
      )}
    />
  );
}

export function LogoLockup({
  variant = "dark",
  subtitle = "Finance System",
}: {
  variant?: "dark" | "light";
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Logo variant={variant} className="h-9" />
      <div className="leading-tight">
        <div
          className={cn(
            "text-sm font-bold tracking-tight",
            variant === "light" ? "text-sidebar-primary" : "text-primary",
          )}
        >
          CGS
        </div>
        <div
          className={cn(
            "text-[11px] font-medium uppercase tracking-[0.14em]",
            variant === "light" ? "text-sidebar-foreground/70" : "text-muted-foreground",
          )}
        >
          {subtitle}
        </div>
      </div>
    </div>
  );
}
