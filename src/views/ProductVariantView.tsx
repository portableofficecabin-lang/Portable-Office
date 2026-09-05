import Link from "next/link";
import { Check, ChevronRight, Ruler, Truck } from "lucide-react";

import { Layout } from "@/components/layout/Layout";
import { JsonLd } from "@/components/JsonLd";
import { ProductGallery } from "@/components/products/ProductGallery";
import { ProductActions } from "@/components/products/ProductActions";
import { ProductKeySpecs } from "@/components/products/ProductKeySpecs";
import { ProductSizeSelector } from "@/components/products/ProductSizeSelector";
import { RelatedProductFamilies } from "@/components/products/RelatedProductFamilies";
import { getProductApplication } from "@/data/productApplications";
import { getBestProductImage } from "@/data/productImages";
import { getImageCaption } from "@/data/productImageCaptions";
import { getCommerce, isOutrightSale } from "@/data/productCommerce";
import {
  builtUpAreaSqFt,
  formatFeet,
  variantDescription,
  variantDimensionsPlain,
  variantHeightFt,
  variantIsPurchasable,
  variantName,
  variantPath,
  type VariantHit,
} from "@/data/productFamilies";
import type { Product } from "@/data/products";
import { DISPATCH_WORKING_DAYS } from "@/data/shippingZones";
import { GST_PERCENT_LABEL, formatINR, gstAmount, sellPrice } from "@/lib/pricing/gst";
import { resolveImageUrl } from "@/utils/resolveImageUrl";
import { generateBreadcrumbSchema } from "@/lib/seo/structured-data";
import {
  generateProductGroupSchema,
  generateSizeVariantProductSchema,
} from "@/lib/seo/productGroupSchema";

const SITE = "https://portableofficecabin.com";

/**
 * ══════════════════════════════════════════════════════════════════════════════════════
 *  ONE STANDARD SIZE of a product family — /products/<family>/<size>
 * ══════════════════════════════════════════════════════════════════════════════════════
 *
 * A pure SERVER component. Every fact a shopper or a crawler needs is in the FIRST HTTP
 * response: the size-specific <h1>, the selected size, the price (or its honest absence),
 * availability, the main image, the crawlable links to every sibling size, the canonical
 * (emitted by generateMetadata on the route) and the ProductGroup + Product JSON-LD.
 *
 * The only client islands are the ones that must be: the gallery (thumbnail switching) and
 * the cart CTAs. Neither renders a price — the price is server HTML — so nothing can flash
 * one figure and replace it with another after hydration.
 *
 * ── MOBILE ORDER ───────────────────────────────────────────────────────────────────────
 * The two-column grid stacks on mobile in exactly the required priority: gallery → title →
 * size selector → price → availability → Add to Cart / Buy Now → specifications → related
 * products. That is DOM order, not a CSS reordering, so a screen reader and a crawler read
 * the same sequence a phone shows.
 */
export function ProductVariantView({
  hit,
  variantProduct,
  parentProduct,
  allProducts,
}: {
  hit: VariantHit;
  /** The variant, shaped as a catalogue Product (variantAsProduct). */
  variantProduct: Product;
  /** The family's parent catalogue product — supplies the gallery and family specs. */
  parentProduct: Product;
  allProducts: Product[];
}) {
  const { family, variant } = hit;

  const pageH1 = variantName(family, variant);
  const canonicalPath = variantPath(family, variant);
  const canonicalUrl = `${SITE}${canonicalPath}`;
  const parentPath = `/products/${family.slug}`;
  const categoryPath = `/products/category/${family.categorySlug}`;

  /* ── GALLERY ──────────────────────────────────────────────────────────────────────────
   * Resolved EXACTLY the way ProductDetailServer resolves it, so og:image, the gallery and
   * (once a size is fed) <g:image_link> can never show three different photos. A size uses
   * its OWN photographs when it has them; otherwise it shows the family gallery — and a
   * size showing the family gallery is held out of the Merchant feed by
   * variantIsFeedEligible(), because Google judges a feed image against its landing page. */
  const fallbackImage = getBestProductImage(
    parentProduct.id,
    family.categorySlug,
    resolveImageUrl(variantProduct.images?.[0]) || undefined,
    parentProduct.sku,
  );
  const galleryImages = (() => {
    const real = (variantProduct.images || [])
      .map((i) => resolveImageUrl(i))
      .filter((i) => i && !i.includes("placeholder"));
    return Array.from(new Set(real.length > 0 ? real : [fallbackImage]));
  })();

  /* ── MONEY ────────────────────────────────────────────────────────────────────────────
   * One predicate, used by the price block, the CTAs (via isPurchasable inside
   * ProductActions) and the JSON-LD Offer. They read the same commerce row, so they cannot
   * disagree. An unpriced size shows NO figure — not a range, not a "from", not a guess. */
  const commerce = getCommerce(variant.variantId);
  const purchasable = variantIsPurchasable(family, variant) && isOutrightSale(variant.variantId);
  const baseExGst = commerce?.basePrice;
  const sellingPrice = purchasable && baseExGst ? sellPrice(baseExGst) : undefined;

  const area = builtUpAreaSqFt(variant);
  const dimensions = variantDimensionsPlain(family, variant);

  /* ── STRUCTURED DATA ──────────────────────────────────────────────────────────────────
   * ProductGroup (identical on every page of the group) + this size's Product node with
   * isVariantOf + its Offer, plus the breadcrumb. Rendered into the initial HTML — never
   * injected after hydration. There is exactly ONE Product node on this page: the generic
   * product schema is deliberately NOT rendered here, so nothing can conflict with it. */
  const groupSchema = generateProductGroupSchema(
    family,
    (parentProduct.images || []).map((i) => resolveImageUrl(i)).filter(Boolean),
  );
  const variantSchema = generateSizeVariantProductSchema(family, variant, galleryImages);
  const breadcrumb = generateBreadcrumbSchema([
    { name: "Home", url: SITE },
    { name: "Products", url: `${SITE}/products` },
    { name: family.categoryName, url: `${SITE}${categoryPath}` },
    { name: family.groupTitle, url: `${SITE}${parentPath}` },
    { name: variant.sizeLabelPlain, url: canonicalUrl },
  ]);

  /* Per-image alt/title. The size is NOT asserted on a photo that has not been confirmed to
   * show that size — the alt describes the family and the view; the size lives in the H1,
   * the spec table and the schema, where it is true. */
  const imageAlt = `${family.groupTitle} by Portable Office Cabin — ${family.categoryName} manufacturer in India`;
  const imageTitle = `${family.groupTitle} | ${family.categoryName} — Portable Office Cabin`;
  const imageMeta = galleryImages.map((img, i) => {
    const caption = getImageCaption(img);
    return caption
      ? {
          alt: `${family.groupTitle} — ${caption} | ${family.categoryName} by Portable Office Cabin`,
          title: `${family.groupTitle} — ${caption} | Portable Office Cabin`,
        }
      : { alt: `${imageAlt} – view ${i + 1}`, title: `${imageTitle} – view ${i + 1}` };
  });

  return (
    <Layout>
      {/* `variantSchema` is null for a size that is not search-eligible, so the array is
          filtered before rendering — otherwise a literal `null` would be emitted as its own
          <script type="application/ld+json"> block. The predicate is written out rather than
          `filter(Boolean)` because only this form NARROWS the type: filter(Boolean) leaves
          `(T | null)[]`, which is how a null reached an `in` check elsewhere and threw. */}
      <JsonLd data={[groupSchema, variantSchema, breadcrumb].filter((node) => node !== null)} />

      {/* Breadcrumb — Home › Products › Container Offices › Container Office › 20 ft x 10 ft */}
      <section className="bg-muted/50 py-4 border-b border-border">
        <div className="container-custom">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm">
            <Link href="/" className="text-muted-foreground hover:text-accent">Home</Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Link href="/products" className="text-muted-foreground hover:text-accent">Products</Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Link href={categoryPath} className="text-muted-foreground hover:text-accent">
              {family.categoryName}
            </Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Link href={parentPath} className="text-muted-foreground hover:text-accent">
              {family.groupTitle}
            </Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span className="text-foreground font-medium" aria-current="page">
              {variant.sizeLabelPlain}
            </span>
          </nav>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* 1 — GALLERY (first in DOM: the mobile LCP element) */}
            <ProductGallery
              galleryImages={galleryImages}
              productName={pageH1}
              productImageAlt={imageAlt}
              productImageTitle={imageTitle}
              imageMeta={imageMeta}
              inStock={variant.availability === "in_stock"}
              purchasable={purchasable}
            />

            <div>
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <Link
                  href={categoryPath}
                  className="text-accent font-medium text-sm tracking-wider hover:underline"
                  data-category={family.categorySlug}
                  title={`${family.categoryName} — Portable Office Cabin`}
                >
                  {family.categoryName.toUpperCase()}
                </Link>
                <span className="text-xs text-muted-foreground font-mono bg-muted px-3 py-1 rounded-full">
                  SKU: {variant.sku}
                </span>
              </div>

              {/* 2 — TITLE. Carries the selected size, so the H1, the <title>, the breadcrumb
                     and the schema all name the same thing. */}
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
                {pageH1}
              </h1>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-5 text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Ruler className="h-4 w-4 text-accent" aria-hidden="true" />
                  <span className="font-medium text-foreground">Size:</span> {dimensions} · {area} sq ft
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Truck className="h-4 w-4 text-accent" aria-hidden="true" />
                  <span className="font-medium text-foreground">Pan-India Delivery</span>
                  <span>· Dispatch {DISPATCH_WORKING_DAYS.min}–{DISPATCH_WORKING_DAYS.max} days + transit</span>
                </span>
              </div>

              /* IsoCertificationBadge WITHDRAWN from public rendering 2026-09-05: no certificate
                 exists in this repository — company.ts records the number QT-99968/0726 and nothing else,
                 with no issuing body, scope or validity. The component is PRESERVED at
                 src/components/IsoCertificationBadge.tsx; re-import and restore this block once the
                 certificate is produced and its scope and validity are confirmed. */

              <p className="text-lg text-muted-foreground mb-6">
                {variantDescription(family, variant)}
              </p>

              {/* 3 — SIZE SELECTOR. Real crawlable links, in the server HTML. */}
              <ProductSizeSelector
                family={family}
                selectedSizeSlug={variant.sizeSlug}
                className="mb-6"
              />

              {/* 4 — PRICE.
                  PURCHASABLE → the GST-INCLUSIVE figure is the PRIMARY, prominent price,
                  because that is the amount Merchant Center receives and the amount the
                  customer is charged. The ex-GST base price is shown underneath as clearly
                  secondary supporting detail — never the headline.
                  UNPRICED → no number at all. Not a range, not a "starting from". */}
              {purchasable && sellingPrice !== undefined && baseExGst !== undefined ? (
                <div className="bg-muted rounded-xl p-6 mb-6">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span
                      className="font-display text-4xl font-bold text-foreground"
                      data-variant-price={sellingPrice}
                    >
                      {formatINR(sellingPrice)}
                    </span>
                    <span className="text-base font-medium text-muted-foreground">
                      including {GST_PERCENT_LABEL} GST
                    </span>
                  </div>
                  <dl className="mt-4 space-y-1.5 border-t border-border/60 pt-3 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-muted-foreground">Base price before GST</dt>
                      <dd className="font-medium text-foreground">{formatINR(baseExGst)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-muted-foreground">GST @ {GST_PERCENT_LABEL}</dt>
                      <dd className="font-medium text-foreground">{formatINR(gstAmount(baseExGst))}</dd>
                    </div>
                  </dl>
                  <p className="text-sm text-muted-foreground mt-3">
                    Transport &amp; installation are calculated from your delivery pincode at
                    checkout and shown in full before payment.
                  </p>
                </div>
              ) : (
                <div className="bg-muted rounded-xl p-6 mb-6">
                  <div className="font-display text-2xl font-bold text-foreground">
                    Price on request for this size
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    The {variant.sizeLabelPlain} {family.groupTitle.toLowerCase()} is built to the
                    specification below. Send us your layout and delivery location and our team will
                    share a written quotation with the binding figure.
                  </p>
                </div>
              )}

              {/* Spec chips, driven by the same commerce row as everything else. */}
              {commerce && <ProductKeySpecs commerce={commerce} className="mb-6" />}

              {/* 5 — AVAILABILITY + lead time, server-rendered above the CTAs. */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Truck className="h-4 w-4 text-accent" aria-hidden="true" />
                  <span className="font-medium text-foreground">
                    {purchasable ? "Dispatch:" : "Delivery:"}
                  </span>{" "}
                  {purchasable
                    ? `Within ${DISPATCH_WORKING_DAYS.min}–${DISPATCH_WORKING_DAYS.max} working days`
                    : variant.leadTime}
                </span>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground"
                  data-availability={variant.availability}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${variant.availability === "in_stock" ? "bg-green-500" : "bg-amber-500"}`}
                    aria-hidden="true"
                  />
                  {purchasable ? "Available to Order" : "Made to Order"}
                </span>
              </div>

              {/* 6 — ADD TO CART / BUY NOW.
                  ProductActions gates itself on isPurchasable(variantProduct.id), which is
                  the SAME predicate as the price block above — so a size can never show a
                  price without a working buy button, or a buy button without a price. The
                  enquiry route (WhatsApp / Call) stays a secondary action beside it. */}
              <ProductActions product={variantProduct} />

              {/* Included configuration — family-level truth, so every size ships with it. */}
              {variant.includedConfiguration.length > 0 && (
                <div className="border-t border-border pt-6">
                  <h2 className="font-display font-semibold text-lg mb-4">
                    Included in this {variant.sizeLabelPlain} configuration
                  </h2>
                  <ul className="grid sm:grid-cols-2 gap-3">
                    {variant.includedConfiguration.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" aria-hidden="true" />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* 7 — SPECIFICATIONS. The size's derived dimensions first, then family specs. */}
          <div className="mt-16">
            <h2 className="font-display text-2xl font-bold text-foreground mb-6">
              {variant.sizeLabelPlain} specifications
            </h2>
            <div className="bg-card rounded-xl shadow-card overflow-x-auto">
              <table className="w-full min-w-[20rem]">
                <tbody>
                  {(variantProduct.specifications || []).map((spec, index) => (
                    <tr key={spec.label} className={index % 2 === 0 ? "bg-muted/30" : "bg-card"}>
                      <th
                        scope="row"
                        className="px-6 py-4 text-left font-medium text-foreground w-1/3 align-top"
                      >
                        {spec.label}
                      </th>
                      <td className="px-6 py-4 text-muted-foreground">{spec.value}</td>
                    </tr>
                  ))}
                  <tr className={(variantProduct.specifications || []).length % 2 === 0 ? "bg-muted/30" : "bg-card"}>
                    <th scope="row" className="px-6 py-4 text-left font-medium text-foreground w-1/3 align-top">
                      Application
                    </th>
                    <td className="px-6 py-4 text-muted-foreground">
                      {getProductApplication(family.categorySlug)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              {variantHeightFt(family, variant) === undefined ? (
                <>
                  Length and width above are this size&rsquo;s own dimensions. External height is
                  normally {formatFeet(family.standardHeightFt)} across the{" "}
                  {family.groupTitle.toLowerCase()} range, but it has not been confirmed for this
                  size — please confirm it with us before ordering.
                </>
              ) : (
                <>
                  Dimensions above are confirmed for this size, at an external height of{" "}
                  {formatFeet(variantHeightFt(family, variant) as number)}.
                </>
              )}{" "}
              Other standard sizes of this product are listed above; anything outside them is quoted
              as a custom build.
            </p>
          </div>

          {/* Cross-links back up the hierarchy — parent and category — so the group is
              crawlable in both directions, not just downward. */}
          <div className="mt-10 rounded-xl border border-border bg-card/50 p-5">
            <h2 className="font-display text-lg font-semibold text-foreground mb-2">
              More about the {family.groupTitle}
            </h2>
            <p className="text-sm text-muted-foreground">
              This page covers the {variant.sizeLabelPlain} size. See the{" "}
              <Link href={parentPath} className="text-accent underline-offset-4 hover:underline">
                {family.groupTitle} overview
              </Link>{" "}
              for the full specification and every standard size, or browse all{" "}
              <Link href={categoryPath} className="text-accent underline-offset-4 hover:underline">
                {family.categoryName.toLowerCase()}
              </Link>
              .{" "}
              {/* Synonyms used NATURALLY in copy — they never become separate pages or
                  Merchant Center records. See productFamilies.ts. */}
              Buyers also search for this unit as a{" "}
              {family.searchAliases.slice(0, 3).join(", ")} — they all describe the same cabin.
            </p>
          </div>

          {/* 8 — RELATED PRODUCT FAMILIES (genuinely different products, never synonyms). */}
          <RelatedProductFamilies
            family={family}
            allProducts={allProducts}
            className="mt-16"
            heading="Related products"
          />
        </div>
      </section>
    </Layout>
  );
}
