/**
 * SPECIFICATION BREAK-UP — expandable component groups with detailed rows. SERVER COMPONENT.
 *
 * The customer-facing version of a bill-of-materials: what the cabin is built from, group by
 * group, with material grades and sections where the owner has verified them — and nothing a
 * public page must not carry (no quantities, no component prices, no supplier names, no admin
 * notes; see the header of src/data/containerOfficeSizes.ts for why each is absent).
 *
 * ── WHY <details>/<summary> AND NOT AN ACCORDION COMPONENT ──────────────────────────────────
 * Native disclosure widgets are keyboard-operable (Tab + Enter/Space), announced correctly by
 * screen readers, and — decisively — render their CONTENT into the server HTML with zero
 * client JavaScript. A Radix accordion would hydrate ~10 KB to do the same job and hide the
 * rows from the no-JS render. The rows are product information; they belong in the document.
 *
 * The first group ships `open` so the section never reads as an empty list of headings, and a
 * crawler or reader-mode user gets the most important group (structure) without interaction.
 *
 * Mobile: each group's table lives in its own `overflow-x-auto` scroller, so a wide row scrolls
 * inside the card and the PAGE never scrolls sideways — the rule every table on this site follows.
 */

import { Check, MinusCircle, PlusCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import type { SpecBreakupGroup, SpecBreakupRow } from "@/data/containerOfficeSizes";

const STATUS_META: Record<
  SpecBreakupRow["status"],
  { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  included: {
    label: "Included",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    icon: Check,
  },
  optional: {
    label: "Optional add-on",
    className: "bg-amber/10 text-amber border-amber/30",
    icon: PlusCircle,
  },
  "customer-scope": {
    label: "Customer scope",
    className: "bg-muted text-muted-foreground border-border",
    icon: MinusCircle,
  },
};

export function SpecificationBreakup({
  groups,
  disclaimer,
  headingId = "specification-breakup",
}: {
  groups: SpecBreakupGroup[];
  /** The honesty frame rendered once above the groups. */
  disclaimer: string;
  headingId?: string;
}) {
  if (groups.length === 0) return null;

  // Serial numbers run continuously across groups, so a row can be cited unambiguously
  // ("row 14") in a call or an email about the specification.
  let serial = 0;

  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="font-display text-2xl font-bold text-foreground mb-3">
        What the cabin is built from
      </h2>
      <p className="text-sm leading-relaxed text-muted-foreground mb-6 max-w-3xl">{disclaimer}</p>

      <div className="space-y-3">
        {groups.map((group, groupIndex) => (
          <details
            key={group.id}
            id={group.id}
            open={groupIndex === 0}
            className="group rounded-xl border border-border bg-card open:shadow-sm"
          >
            <summary
              className={cn(
                "flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl p-4",
                "font-display font-bold text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                // Hide the default marker cross-browser; the +/- chip below is the affordance.
                "[&::-webkit-details-marker]:hidden",
              )}
            >
              <span className="min-w-0">
                <span className="block">{group.title}</span>
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                  {group.summary}
                </span>
              </span>
              <span
                aria-hidden="true"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-transform group-open:rotate-45"
              >
                <PlusCircle className="h-4 w-4" />
              </span>
            </summary>

            <div className="overflow-x-auto border-t border-border">
              <table className="w-full min-w-[40rem] text-sm">
                <caption className="sr-only">{`${group.title} — components, materials and scope`}</caption>
                <thead>
                  <tr className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th scope="col" className="px-4 py-2.5 font-semibold w-10">
                      #
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">
                      Component
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">
                      Material / standard
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">
                      Section / thickness
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">
                      Scope
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((row) => {
                    serial += 1;
                    const status = STATUS_META[row.status];
                    const StatusIcon = status.icon;
                    return (
                      <tr key={row.item} className="border-t border-border/60 align-top">
                        <td className="px-4 py-3 text-muted-foreground tabular-nums">{serial}</td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-foreground">{row.item}</span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                            {row.description}
                          </span>
                          {row.customerNote && (
                            <span className="mt-1 block text-xs italic leading-relaxed text-muted-foreground">
                              {row.customerNote}
                            </span>
                          )}
                        </td>
                        {/* Absent grade/section = genuinely unverified — the cell stays honest
                            with an em dash rather than a placeholder sentence. */}
                        <td className="px-4 py-3 text-muted-foreground">{row.materialGrade ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{row.section ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold",
                              status.className,
                            )}
                          >
                            <StatusIcon className="h-3 w-3" aria-hidden="true" />
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
