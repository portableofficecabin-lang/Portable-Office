import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ISO 9001:2015 certification badge — a compact, premium trust marker.
 *
 * Only the "ISO 9001:2015 Certified Company" line is highlighted; the quality-system
 * scope and certificate number stay as supporting detail. Single source of truth for
 * the certificate wording across the site (home hero, product pages, footer, …).
 *
 * variant:
 *   • "default" — semantic tokens, for light/card surfaces (e.g. product pages)
 *   • "onDark"  — white/accent styling, for dark surfaces (e.g. the home hero, footer)
 */
export function IsoCertificationBadge({
  variant = "default",
  className,
}: {
  variant?: "default" | "onDark";
  className?: string;
}) {
  const onDark = variant === "onDark";
  return (
    <div
      className={cn(
        "inline-flex items-center gap-3 rounded-xl border px-4 py-2.5",
        onDark ? "border-white/15 bg-white/[0.08]" : "border-border bg-card/60 shadow-sm",
        className,
      )}
    >
      <ShieldCheck className="h-7 w-7 shrink-0 text-accent" aria-hidden="true" />
      <div className="leading-tight">
        <div className={cn("text-sm font-bold tracking-tight", onDark ? "text-white" : "text-foreground")}>
          ISO 9001:2015 Certified Company
        </div>
        <div className={cn("text-[11px]", onDark ? "text-white/60" : "text-muted-foreground")}>
          Quality Management System · Certificate No.: QT-99968/0726
        </div>
      </div>
    </div>
  );
}
