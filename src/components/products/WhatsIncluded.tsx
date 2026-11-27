// SERVER COMPONENT — "What's Included" on category landing pages (WHATS_INCLUDED_CATEGORY_SLUGS).
// Every line comes from src/data/deliveryCopy.ts, which reads src/data/shippingZones.ts — the
// same table checkout charges from and the same sentences the product-page Shipping & Delivery
// pop-up prints — so this block can never promise more than the cart and checkout sell.
import { CheckCircle2, MinusCircle, Truck, Wrench, type LucideIcon } from "lucide-react";

import { QUOTED_MODELS_NOTE, whatsIncludedGroups, type WhatsIncludedGroup } from "@/data/deliveryCopy";

const ICONS: Record<WhatsIncludedGroup["kind"], LucideIcon> = {
  included: CheckCircle2,
  delivery: Truck,
  installation: Wrench,
  excluded: MinusCircle,
};

export function WhatsIncluded({ id, showQuotedNote }: { id: string; showQuotedNote: boolean }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="font-display text-2xl font-bold text-foreground mb-4">
        What&apos;s Included
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-5 max-w-3xl">
        What the listed price covers, how delivery and installation are charged, and what is quoted
        separately — the same terms checkout applies.
      </p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {whatsIncludedGroups().map((g) => {
          const Icon = ICONS[g.kind];
          return (
            <li key={g.title} className="rounded-xl border border-border/60 bg-card p-5">
              <h3 className="font-display text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                <Icon className="h-5 w-5 text-accent shrink-0" aria-hidden="true" />
                {g.title}
              </h3>
              <ul className="space-y-1.5 text-sm text-muted-foreground leading-relaxed list-disc pl-5">
                {g.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
      {showQuotedNote && <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-3xl">{QUOTED_MODELS_NOTE}</p>}
    </section>
  );
}
