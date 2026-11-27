/**
 * Per-model specification rows for a category landing page's spec table (CategorySpecTable).
 * Each row is the product's OWN catalogue `specifications` entry — the same array its product
 * page renders and the Merchant feed turns into <g:product_detail> — never retyped here.
 */
import { products } from "@/data/products";

/** Categories whose landing section shows the table (Search Console phase, 2026-11-27). */
export const SPEC_TABLE_CATEGORY_SLUGS: readonly string[] = ["portable-toilet-cabins"];

export interface CategorySpecRows {
  model: { id: string; name: string; path: string };
  specs: { label: string; value: string }[];
}

export function categorySpecRows(slug: string, models: { id: string; name: string; path: string }[]): CategorySpecRows[] {
  if (!SPEC_TABLE_CATEGORY_SLUGS.includes(slug)) return [];
  return models
    .map((m) => ({
      model: m,
      specs: (products.find((p) => p.id === m.id)?.specifications ?? [])
        .filter((s) => s.label?.trim() && s.value?.trim())
        .map((s) => ({ label: s.label, value: s.value })),
    }))
    .filter((r) => r.specs.length > 0);
}
