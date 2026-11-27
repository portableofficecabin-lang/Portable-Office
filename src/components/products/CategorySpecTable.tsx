// SERVER COMPONENT — per-model specification table on a category landing page. The rows come from
// src/data/categorySpecTables.ts: each is the product's OWN catalogue `specifications` entry, rendered
// from data and never retyped, so the table always matches the product page's spec grid.
import Link from "next/link";

import { categorySpecRows } from "@/data/categorySpecTables";

const linkClass =
  "font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded";

export function CategorySpecTable({
  slug,
  categoryName,
  models,
}: {
  slug: string;
  categoryName: string;
  models: { id: string; name: string; path: string }[];
}) {
  const rows = categorySpecRows(slug, models);
  if (rows.length === 0) return null;
  const headingId = `${slug}-specs`;

  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="font-display text-2xl font-bold text-foreground mb-4">
        {`${categoryName}: Specifications`}
      </h2>
      <p className="text-muted-foreground leading-relaxed mb-5 max-w-3xl">
        The specification of each listed model, exactly as set out on its product page.
      </p>
      <div className="space-y-6">
        {rows.map(({ model, specs }) => (
          <div key={model.id} className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <caption className="px-4 py-3 text-left font-semibold text-foreground bg-muted/50">
                <Link href={model.path} className={linkClass}>
                  {model.name}
                </Link>
              </caption>
              <tbody>
                {specs.map((s) => (
                  <tr key={s.label} className="border-t border-border/60 align-top">
                    <th scope="row" className="w-1/3 px-4 py-3 text-left font-medium text-foreground">
                      {s.label}
                    </th>
                    <td className="px-4 py-3 text-muted-foreground">{s.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </section>
  );
}
