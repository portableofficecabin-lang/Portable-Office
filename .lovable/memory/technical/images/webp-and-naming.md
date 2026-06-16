---
name: WebP + Product-Named Geo-Tagged Images
description: All product/site images must be WebP, compressed, named after product title, and auto geo-tagged
type: preference
---
**Mandatory for ALL current and future image uploads:**

1. **Format: WebP only.** Convert every uploaded PNG/JPG to `.webp` (quality 78–82, max width 1600px) before saving to `public/images/products/` or `src/assets/`. Use the `scripts/convert-webp.mjs` pattern or sharp directly. Remove the original PNG/JPG after conversion if the WebP replaces it in references.
2. **Filename = product title (kebab-case) + descriptive view suffix.** Example: for "Guard Security Cabin" use `guard-security-cabin-front.webp`, `-back.webp`, `-interior.webp`, etc. Never keep AI-generated random hash filenames.
3. **Geo-tagging is automatic** via `src/components/seo/GlobalGeoSignals.tsx` + `src/utils/imageGeoTagging.ts` — alt/title attributes get geo signals injected at runtime. Always set a meaningful base `alt` derived from the product title; the geo helper appends location keywords.
4. **All references must use `.webp` extension** in `src/data/products.ts`, product content components, and SEO data.

**How to apply:** When the user uploads images for a product, (a) copy to `public/images/products/<product-slug>-<view>.webp` via sharp conversion, (b) update `images: []` in products.ts with the new webp paths, (c) confirm alt text uses the product title.
