/**
 * SITE INVENTORY — the repeatable, evidence-based page audit behind docs/seo/.
 *
 *   npm run seo:inventory -- <origin> [--out <dir>] [--only <path-prefix>] [--concurrency N]
 *
 *   <origin>  http://localhost:3010 (a `next start` of a production build) or
 *             https://portableofficecabin.com. The URL list is the site's OWN /sitemap.xml, so the
 *             page count is discovered, never hardcoded; production hosts inside the sitemap are
 *             rewritten to <origin> when auditing a local build.
 *   --out     directory for inventory.json / inventory.csv / inventory.md (default ./seo-inventory,
 *             which is git-ignored by nothing — point it at a scratch folder).
 *
 * WHAT IT DOES
 *   Fetches every sitemap URL the way a crawler that runs no JavaScript receives it (no redirects
 *   followed, Googlebot UA) and records what is PRESENT in that HTML — it never guesses what a page
 *   "probably" has. Every status in the matrix comes from named checks (RULES below), and every
 *   failed check carries its recommended fix, priority, regression risk and whether the owner must
 *   approve it, so a reader can see exactly why a cell says what it says.
 *
 *   Per page:  status, title / description / canonical / robots / og:image, H1s outside React's
 *              hidden streaming buffer (<div hidden id="S:…">), H2/H3 outline, word count of <main>,
 *              visible FAQ questions vs FAQPage JSON-LD, every JSON-LD @type, the Product offer price
 *              and name vs the commerce catalogue, BreadcrumbList vs the visible trail, images
 *              without alt, every ₹ figure in <main>, internal links out of <main>, CTAs, and the
 *              commerce record the page sells.
 *   Cross-page: duplicate titles / descriptions / H1s, FAQ questions reused across pages, 8-word
 *              shingle similarity between pages of one type, in-degree from <main> links (orphans),
 *              and a head-term × place keyword map (cannibalisation candidates).
 *
 *   READ-ONLY and not a CI gate: it imports the catalogue to label pages but changes nothing, and
 *   exits 0 unless the origin is unreachable. Thresholds live in one block directly below.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { products, getProductDetailPath, categories } from "../../src/data/products";
import { getCommerce, isPurchasable, isOutrightSale, feedEligible } from "../../src/data/productCommerce";
import { feedExclusionFor } from "../../src/data/merchantFeedPolicy";
import { CITY_PAGES } from "../../src/data/cityPages";
import { containerOfficeLocation } from "../../src/data/containerOfficeCluster";
import { sellPrice } from "../../src/lib/pricing/gst";
import { pageType, type PageType } from "./page-groups";

/* ─────────────────────────────────────────── thresholds ─────────────────────────────────────── */

const TITLE_MAX = 65; // chars of the rendered <title>, brand suffix included
const TITLE_MIN = 20;
const DESC_MIN = 70;
const DESC_MAX = 160;
const MIN_H2 = 2;
const FAQ_GOOD = 3; // visible questions for an AEO "implemented"
const THIN_WORDS: Record<PageType, number> = {
  product: 400, "product-guide": 400, "size-variant": 250, category: 300, city: 600,
  directory: 300, promotion: 400, blog: 500, home: 300, hub: 300, static: 150, policy: 150,
};
const FAQ_REUSE_PAGES = 4; // a question rendered on ≥ this many pages counts as templated
const SIMILARITY_FLAG = 0.5; // 8-word shingle Jaccard between two pages of the same type
const PROD_HOST = "https://portableofficecabin.com";
const UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

/* ───────────────────────────────────────────── args ─────────────────────────────────────────── */

const argv = process.argv.slice(2);
const origin = (argv.find((a) => /^https?:\/\//.test(a)) ?? "").replace(/\/$/, "");
if (!origin) {
  console.error("usage: npm run seo:inventory -- <origin> [--out dir] [--only /path-prefix] [--concurrency N]");
  process.exit(2);
}
const flag = (name: string) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
const outDir = resolve(flag("--out") ?? "seo-inventory");
const only = flag("--only");
const concurrency = Number(flag("--concurrency") ?? 4);

/* ───────────────────────────────────────────── types ────────────────────────────────────────── */

type Dim = "SEO" | "AEO" | "GEO" | "AIO" | "SXO";
type Status = "Already implemented" | "Needs improvement" | "Missing" | "Not applicable" | "Requires verification";

interface Check { dim: Dim; ok: boolean; id: string; detail: string }

interface Recommendation {
  fix: string;
  priority: "P1" | "P2" | "P3";
  risk: "Low" | "Medium" | "High";
  approval: string; // "No" or who/what must approve
}

interface PageRecord {
  url: string;
  path: string;
  type: PageType;
  httpStatus: number;
  location?: string;
  title: string;
  description: string;
  canonical: string;
  robots: string;
  ogImage: string;
  h1: string[];
  h1InHiddenBuffer: number;
  h2: string[];
  h3Count: number;
  words: number;
  faqVisible: string[];
  faqSchema: string[];
  ldTypes: string[];
  ldErrors: number;
  breadcrumbSchema: string[];
  breadcrumbVisible: string; // text of the visible trail, "" when absent
  productLd?: { name?: string; price?: string; availability?: string };
  feedTitle?: string;
  rupeeFigures: string[];
  internalLinks: string[];
  externalLinks: number;
  images: number;
  imagesNoAlt: number;
  tables: number;
  ctas: { cart: boolean; quote: boolean; tel: boolean; whatsapp: boolean; form: boolean };
  signals: { gstStatement: boolean; delivery: boolean; installation: boolean; specTable: boolean; comparison: boolean; warranty: boolean; projectEvidence: boolean };
  commerce?: { id: string; sku: string; kind: string; purchasable: boolean; outright: boolean; fed: boolean; feedHold?: string; sellPrice: number; h1Title: string };
  intent: string;
  checks: Check[];
  status: Record<Dim, Status>;
  inDegreeMain: number;
  maxSimilarity?: { path: string; score: number };
}

/* ──────────────────────────────────────────── html utils ────────────────────────────────────── */

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/&#8377;/g, "₹")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));

/** Visible text of an HTML fragment: tags out, React's <!-- --> text separators out, <wbr> zero-width. */
const textOf = (html: string) =>
  decode(html.replace(/<!--[\s\S]*?-->/g, "").replace(/<wbr\s*\/?>/gi, "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

const attr = (tag: string, name: string) => {
  const m = tag.match(new RegExp(`\\s${name}=(?:"([^"]*)"|'([^']*)')`, "i"));
  return m ? decode(m[1] ?? m[2] ?? "") : undefined;
};

const metaContent = (html: string, key: string, by: "name" | "property" = "name") => {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if ((attr(tag, by) ?? "").toLowerCase() === key) return attr(tag, "content") ?? "";
  }
  return "";
};

const linkHref = (html: string, rel: string) => {
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    if ((attr(tag, "rel") ?? "").toLowerCase() === rel) return attr(tag, "href") ?? "";
  }
  return "";
};

/** "1. Q", "1 Q" (a numbered badge <span> before the text), "Q1: Q" → "Q". */
const stripNumbering = (q: string) => q.replace(/^(?:Q\s?)?\d+\s*[.):]?\s+/i, "");

const allMatches = (html: string, re: RegExp) => Array.from(html.matchAll(re), (m) => m[1]);

/** Flatten JSON-LD into a node list (arrays and @graph are walked). */
function ldNodes(value: unknown, out: Record<string, unknown>[] = []): Record<string, unknown>[] {
  if (Array.isArray(value)) value.forEach((v) => ldNodes(v, out));
  else if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    if (o["@type"]) out.push(o);
    if (o["@graph"]) ldNodes(o["@graph"], out);
  }
  return out;
}
const typesOf = (n: Record<string, unknown>) => ([] as unknown[]).concat(n["@type"] ?? []).map(String);
const fmtINR = (n: number) => "₹" + n.toLocaleString("en-IN");

/* ─────────────────────────────────────────── classification ─────────────────────────────────── */

const productByPath = new Map(products.map((p) => [getProductDetailPath(p), p]));
const fedSkus = new Set(feedEligible().filter((c) => !feedExclusionFor(c.sku)).map((c) => c.sku));

/** Search intent, stated from what the page is and its own H1 — never from a keyword tool. */
function intentFor(r: PageRecord): string {
  const h1 = r.h1[0] ?? "";
  switch (r.type) {
    case "product": return r.commerce?.kind === "service" ? `Commercial (service): ${h1}` : r.commerce?.outright === false && r.commerce.purchasable ? `Transactional (booking): ${h1}` : `Transactional: buy ${h1}`;
    case "size-variant": return `Transactional (size): ${h1}`;
    case "product-guide": return `Informational / pre-purchase: ${h1}`;
    case "category": return `Commercial investigation: ${h1}`;
    case "hub": return `Commercial investigation (hub): ${h1}`;
    case "city": return `Local commercial: ${h1}`;
    case "directory": return "Navigational: service locations";
    case "promotion": return `Local commercial (generated keyword × location grid): ${h1}`;
    case "blog": return `Informational: ${h1}`;
    case "policy": return `Trust / policy: ${h1}`;
    case "home": return "Navigational / brand";
    default: return `Navigational: ${h1}`;
  }
}

/* ───────────────────────────────────────────── parsing ──────────────────────────────────────── */

function parsePage(url: string, path: string, status: number, html: string, location?: string): PageRecord {
  const ld = allMatches(html, /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
  let ldErrors = 0;
  const nodes: Record<string, unknown>[] = [];
  for (const block of ld) {
    try { ldNodes(JSON.parse(block), nodes); } catch { ldErrors++; }
  }
  const stripped = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
  const hiddenAt = stripped.search(/<div hidden(?:="")? id="S:/);
  const visible = hiddenAt >= 0 ? stripped.slice(0, hiddenAt) : stripped;
  const mainStart = visible.search(/<main\b/i);
  const mainEnd = visible.lastIndexOf("</main>");
  const main = mainStart >= 0 ? visible.slice(mainStart, mainEnd > mainStart ? mainEnd : undefined) : visible;
  const mainText = textOf(main);

  const h1 = allMatches(visible, /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi).map(textOf);
  const h1Hidden = hiddenAt >= 0 ? (stripped.slice(hiddenAt).match(/<h1\b/gi) ?? []).length : 0;
  const h2 = allMatches(main, /<h2\b[^>]*>([\s\S]*?)<\/h2>/gi).map(textOf);
  const h3Count = (main.match(/<h3\b/gi) ?? []).length;

  // Visible FAQ questions: an h3 / h4 / summary / button / dt inside <main> ending in "?". H2s are left
  // out on purpose — section CTAs ("Ready to get started?") are H2s and are not questions a page answers.
  const faqVisible = Array.from(
    new Set(
      allMatches(main, /<(?:h3|h4|summary|button|dt)\b[^>]*>([\s\S]*?)<\/(?:h3|h4|summary|button|dt)>/gi)
        .map(textOf)
        .map(stripNumbering)
        .filter((q) => q.endsWith("?") && q.length > 8),
    ),
  );

  const faqPage = nodes.filter((n) => typesOf(n).includes("FAQPage"));
  const faqSchema = faqPage.flatMap((n) =>
    ([] as Record<string, unknown>[]).concat((n.mainEntity as Record<string, unknown>[]) ?? []).map((q) => String(q.name ?? "")),
  );
  const crumbs = nodes.find((n) => typesOf(n).includes("BreadcrumbList"));
  const breadcrumbSchema = crumbs
    ? ([] as Record<string, unknown>[]).concat((crumbs.itemListElement as Record<string, unknown>[]) ?? []).map((i) => String(i.name ?? ""))
    : [];
  const productNode = nodes.find((n) => typesOf(n).includes("Product"));
  const offer = productNode ? ([] as Record<string, unknown>[]).concat((productNode.offers as Record<string, unknown>) ?? [])[0] : undefined;

  // The visible trail: a <nav aria-label="Breadcrumb">, or the first <nav> in <main> that starts at Home.
  const navs = visible.match(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi) ?? [];
  const trailNav = navs.find((n) => /aria-label="breadcrumb"/i.test(n)) ?? (main.match(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi) ?? []).find((n) => /href="\/"[^>]*>\s*Home\s*</i.test(n));

  const imgs = visible.match(/<img\b[^>]*>/gi) ?? [];
  const internal = new Set<string>();
  let external = 0;
  for (const tag of main.match(/<a\b[^>]*>/gi) ?? []) {
    const href = attr(tag, "href") ?? "";
    if (/^(tel:|mailto:|#|javascript:)/i.test(href)) continue;
    const abs = href.startsWith("/") ? href : href.startsWith(PROD_HOST) || href.startsWith(origin) ? href.replace(PROD_HOST, "").replace(origin, "") || "/" : null;
    if (abs === null) { if (/^https?:/i.test(href)) external++; continue; }
    internal.add(abs.split("#")[0].split("?")[0].replace(/\/$/, "") || "/");
  }

  const lower = mainText.toLowerCase();
  const rec: PageRecord = {
    url, path, type: pageType(path), httpStatus: status, location,
    title: textOf(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ""),
    description: metaContent(html, "description"),
    canonical: linkHref(html, "canonical"),
    robots: metaContent(html, "robots"),
    ogImage: metaContent(html, "og:image", "property"),
    h1, h1InHiddenBuffer: h1Hidden, h2, h3Count,
    words: mainText.split(/\s+/).filter(Boolean).length,
    faqVisible, faqSchema,
    ldTypes: Array.from(new Set(nodes.flatMap(typesOf))).sort(),
    ldErrors,
    breadcrumbSchema,
    breadcrumbVisible: trailNav ? textOf(trailNav) : "",
    productLd: productNode ? { name: String(productNode.name ?? ""), price: offer ? String(offer.price ?? "") : undefined, availability: offer ? String(offer.availability ?? "") : undefined } : undefined,
    rupeeFigures: Array.from(new Set((mainText.match(/₹\s?\d[\d,]*(?:\.\d+)?(?:\s?(?:lakhs?|crores?|cr)\b)?/g) ?? []).map((f) => f.replace(/,$/, "")))),
    internalLinks: Array.from(internal).sort(),
    externalLinks: external,
    images: imgs.length,
    imagesNoAlt: imgs.filter((t) => attr(t, "alt") === undefined).length,
    tables: (main.match(/<table\b/gi) ?? []).length,
    ctas: {
      cart: /add to cart|buy now/i.test(mainText),
      // A quotation / enquiry ask, or a "next step" button to the models (guides end on "View … Range").
      quote: /quot(e|ation)|enquir|request a|\b(view|browse|explore|shop)\b[^.?!]{0,40}\b(range|models|products|containers|offices|cabins)\b/i.test(mainText),
      tel: /href="tel:/i.test(main),
      whatsapp: /wa\.me|api\.whatsapp|whatsapp\.com\/send/i.test(main),
      form: /<form\b/i.test(main),
    },
    signals: {
      gstStatement: /inclusive of all taxes|incl\.? gst|including gst|excl\.? gst|excluding gst|\+ ?gst/i.test(mainText),
      delivery: /deliver|transport|dispatch/i.test(lower),
      installation: /install/i.test(lower),
      specTable: /specification/i.test(h2.join(" ")) || (main.match(/<table\b/gi) ?? []).length > 0,
      comparison: /\bvs\.?\b|versus|compar/i.test(h2.join(" ")) || /<th\b[\s\S]*?<th\b[\s\S]*?<th\b/i.test(main),
      warranty: /warrant/i.test(lower),
      projectEvidence: /case stud|completed project|project gallery|installed (?:for|at) /i.test(lower),
    },
    intent: "",
    checks: [],
    status: { SEO: "Not applicable", AEO: "Not applicable", GEO: "Not applicable", AIO: "Not applicable", SXO: "Not applicable" },
    inDegreeMain: 0,
  };

  if (rec.type === "product-guide" && productNode && nodes.some((n) => typesOf(n).includes("ProductGroup"))) rec.type = "size-variant";
  const product = productByPath.get(path);
  if (product) {
    const c = getCommerce(product.id);
    if (c) {
      const hold = feedExclusionFor(c.sku);
      rec.commerce = {
        id: product.id, sku: c.sku, kind: c.kind, purchasable: isPurchasable(product.id), outright: isOutrightSale(product.id),
        fed: fedSkus.has(c.sku), feedHold: hold?.category, sellPrice: sellPrice(c.basePrice), h1Title: c.h1Title,
      };
      rec.feedTitle = c.feedTitle;
    }
  }
  rec.intent = intentFor(rec);
  return rec;
}

/* ───────────────────────────────────────────── checks ───────────────────────────────────────── */

const add = (r: PageRecord, dim: Dim, ok: boolean, id: string, detail: string) => r.checks.push({ dim, ok, id, detail });

function evaluate(r: PageRecord) {
  const indexable = r.httpStatus === 200 && !/noindex/i.test(r.robots);
  const selfCanonical = r.canonical.replace(PROD_HOST, "").replace(origin, "").replace(/\/$/, "") === (r.path === "/" ? "" : r.path);

  // SEO
  add(r, "SEO", r.httpStatus === 200, "status-200", `HTTP ${r.httpStatus}${r.location ? ` → ${r.location}` : ""}`);
  add(r, "SEO", indexable, "indexable", r.robots ? `robots="${r.robots}"` : "no robots meta (indexable)");
  add(r, "SEO", selfCanonical, "self-canonical", r.canonical || "missing");
  add(r, "SEO", r.title.length >= TITLE_MIN && r.title.length <= TITLE_MAX, "title-length", `${r.title.length} chars`);
  add(r, "SEO", r.description.length >= DESC_MIN && r.description.length <= DESC_MAX, "description-length", `${r.description.length} chars`);
  add(r, "SEO", r.h1.length === 1 && r.h1InHiddenBuffer === 0, "one-server-h1", `${r.h1.length} visible, ${r.h1InHiddenBuffer} hidden`);
  if (r.type !== "policy" && r.type !== "static") add(r, "SEO", r.h2.length >= MIN_H2, "h2-outline", `${r.h2.length} H2`);
  if (r.type !== "home") add(r, "SEO", r.breadcrumbVisible !== "", "visible-breadcrumb", r.breadcrumbVisible || "absent");
  add(r, "SEO", r.imagesNoAlt === 0, "img-alt", `${r.imagesNoAlt}/${r.images} without alt`);
  add(r, "SEO", r.words >= THIN_WORDS[r.type], "content-depth", `${r.words} words in <main> (threshold ${THIN_WORDS[r.type]})`);

  // AEO — only where buyers ask questions the page should answer
  if (["product", "category", "city", "promotion", "hub", "product-guide", "size-variant"].includes(r.type)) {
    add(r, "AEO", r.faqVisible.length >= FAQ_GOOD, "visible-faq", `${r.faqVisible.length} visible questions`);
  }
  if (r.faqSchema.length) {
    const vis = new Set(r.faqVisible.map((q) => q.toLowerCase()));
    const missing = r.faqSchema.filter((q) => !vis.has(stripNumbering(q).toLowerCase()));
    add(r, "AEO", missing.length === 0, "faq-schema-matches-visible", missing.length ? `${missing.length}/${r.faqSchema.length} FAQPage questions not visible` : `${r.faqSchema.length} match`);
  }

  // AIO — the machine-readable layer agrees with the visible page
  add(r, "AIO", r.ldErrors === 0, "jsonld-parses", `${r.ldErrors} unparsable blocks`);
  add(r, "AIO", r.h1InHiddenBuffer === 0, "critical-content-ssr", r.h1InHiddenBuffer ? "H1 inside hidden streaming buffer" : "H1 in server HTML");
  if (r.type !== "home") {
    add(r, "AIO", r.ldTypes.includes("BreadcrumbList"), "breadcrumb-schema", r.ldTypes.includes("BreadcrumbList") ? "present" : "absent");
    if (r.breadcrumbSchema.length && r.breadcrumbVisible) {
      const last = r.breadcrumbSchema[r.breadcrumbSchema.length - 1];
      add(r, "AIO", r.breadcrumbVisible.includes(last), "breadcrumb-schema-matches-trail", `schema "${last}" vs visible "${r.breadcrumbVisible}"`);
    }
  }
  if (r.type === "product" && r.commerce?.outright) {
    add(r, "AIO", r.ldTypes.includes("Product"), "product-schema", r.ldTypes.includes("Product") ? "present" : "absent");
    add(r, "AIO", Number(r.productLd?.price) === r.commerce.sellPrice, "offer-price-equals-catalogue", `JSON-LD ${r.productLd?.price ?? "none"} vs catalogue ${r.commerce.sellPrice}`);
    // The JSON-LD name of a purchasable SKU is its Merchant feed title by design (structured-data.ts,
    // protected): it must equal the feed title, not the shorter on-page H1.
    add(r, "AIO", r.productLd?.name === r.feedTitle, "product-name-equals-feed-title", `"${r.productLd?.name}"`);
  }
  if (r.type === "category" || r.type === "directory") {
    add(r, "AIO", r.ldTypes.some((t) => t === "ItemList" || t === "CollectionPage"), "collection-schema", r.ldTypes.join(", "));
  }

  // SXO — the path from landing to an enquiry or a purchase
  if (r.type === "product") {
    if (r.commerce?.purchasable) {
      add(r, "SXO", r.ctas.cart, "add-to-cart-visible", r.ctas.cart ? "present" : "absent");
      const shown = r.rupeeFigures.some((f) => f.replace(/\s/g, "") === fmtINR(r.commerce!.sellPrice));
      add(r, "SXO", shown, "approved-price-visible", `${fmtINR(r.commerce.sellPrice)} ${shown ? "shown" : "not found"}`);
      add(r, "SXO", r.signals.gstStatement, "gst-statement", r.signals.gstStatement ? "present" : "absent");
      const other = r.rupeeFigures.filter((f) => f.replace(/\s/g, "") !== fmtINR(r.commerce!.sellPrice));
      add(r, "SXO", other.length === 0, "no-conflicting-rupee", other.length ? `other ₹ in <main>: ${other.join(", ")}${r.commerce.fed ? " (FED SKU)" : " (not fed)"}` : "only the approved price");
    }
    add(r, "SXO", r.signals.delivery && r.signals.installation, "delivery-installation-info", `delivery ${r.signals.delivery}, installation ${r.signals.installation}`);
  }
  if (["city", "promotion", "category", "product-guide", "hub", "directory", "size-variant"].includes(r.type)) {
    add(r, "SXO", r.ctas.quote || r.ctas.cart, "primary-cta", `quote ${r.ctas.quote}, cart ${r.ctas.cart}`);
    add(r, "SXO", r.ctas.tel || r.ctas.whatsapp, "direct-contact-in-content", `tel ${r.ctas.tel}, whatsapp ${r.ctas.whatsapp} (header/footer/float not counted)`);
  }
  if (r.type === "city") add(r, "SXO", r.rupeeFigures.length === 0, "no-rupee-on-city-page", r.rupeeFigures.join(", ") || "none (site rule)");

  // GEO — evidence a reader or an answer engine can verify
  if (["product", "category", "hub", "size-variant"].includes(r.type)) {
    add(r, "GEO", r.signals.specTable, "verifiable-specs", r.signals.specTable ? "spec table / specification section" : "no spec table");
  }
  if (["product", "category", "city", "promotion", "hub", "size-variant"].includes(r.type)) {
    add(r, "GEO", r.signals.projectEvidence, "project-evidence", r.signals.projectEvidence ? "present" : "no verified project / case-study block");
  }
}

/** Fix / priority / risk / approval for one failed check, in the context of its page. */
function recommend(r: PageRecord, c: Check): Recommendation {
  const t = r.type;
  switch (c.id) {
    case "title-length":
      if (t === "product") return { fix: "Title is the Merchant feed title (feedTitle) — shorten only together with the feed", priority: "P3", risk: "High", approval: "Owner + protected Merchant flow" };
      if (t === "category") return { fix: "Shorten category title (held as C7 pending GSC data)", priority: "P3", risk: "Medium", approval: "Owner (C7)" };
      return { fix: "Shorten the <title> to ≤65 chars incl. brand suffix", priority: "P3", risk: "Low", approval: "Owner copy" };
    case "description-length":
      if (t === "category") return { fix: "Real category description — delivered by open PR #86 (categoryLandingMetaDescription) for landing categories", priority: "P2", risk: "Low", approval: "Merge #86" };
      if (t === "city") return { fix: "Trim owner-supplied meta description to ≤160 chars", priority: "P3", risk: "Low", approval: "Owner copy" };
      return { fix: "Rewrite meta description to 70–160 chars", priority: "P3", risk: "Low", approval: t === "directory" ? "No" : "Owner copy" };
    case "visible-breadcrumb":
      if (t === "promotion") return { fix: "Add the visible trail the BreadcrumbList already describes (SEOPromotionPage template)", priority: "P2", risk: "Low", approval: "No" };
      return { fix: "Pass `breadcrumbs` to PageHero (renders <nav aria-label=Breadcrumb>)", priority: "P2", risk: "Low", approval: "No" };
    case "breadcrumb-schema":
      return { fix: "Emit BreadcrumbList matching the visible trail", priority: "P3", risk: "Low", approval: "No" };
    case "breadcrumb-schema-matches-trail":
      return { fix: "Make the last BreadcrumbList name equal the visible last crumb", priority: "P2", risk: "Low", approval: "No" };
    case "visible-faq":
      if (t === "category") return { fix: "Category FAQ — delivered by #86 for 6 landing categories; 7 empty categories await product mapping (C12)", priority: "P2", risk: "Low", approval: "Merge #86 / owner (C12)" };
      if (t === "product") return { fix: "Product-specific FAQ from verified catalogue facts only (sizes, dispatch, transport, installation)", priority: "P2", risk: "Medium", approval: "Owner facts for anything not in the catalogue" };
      return { fix: "Answer-first FAQ for this page's real buyer questions", priority: "P3", risk: "Low", approval: "Owner copy" };
    case "faq-schema-matches-visible":
      return { fix: "Render every FAQPage question visibly or drop it from the schema", priority: "P1", risk: "Low", approval: "No" };
    case "faq-originality":
      return { fix: "Replace templated questions with page-specific ones", priority: "P2", risk: "Low", approval: "Owner copy" };
    case "distinct-content":
      if (t === "category") return { fix: "Global 'Full Catalogue A–Z' + link hub dominate every category page — scope the A–Z index to /products (proposal in docs)", priority: "P2", risk: "Medium", approval: "Owner (reverses a deliberate crawl-aid placement)" };
      if (t === "promotion") return { fix: "Generated keyword × location grid: consolidate / differentiate (needs GSC data)", priority: "P1", risk: "High", approval: "Owner + GSC review" };
      return { fix: "Differentiate copy from the near-duplicate sibling", priority: "P2", risk: "Medium", approval: "Owner copy" };
    case "linked-from-content":
      return { fix: "Add a contextual link from the parent hub / category", priority: "P2", risk: "Low", approval: "No" };
    case "content-depth":
      return { fix: "Add verified, product-specific detail (specs, applications, delivery)", priority: "P2", risk: "Low", approval: "Owner facts" };
    case "h2-outline":
      return { fix: "Give the page a sectioned H2 outline", priority: "P3", risk: "Low", approval: "No" };
    case "collection-schema":
      if (t === "category") return { fix: "Summary ItemList — delivered by #86 for landing categories; none for empty categories", priority: "P3", risk: "Low", approval: "Merge #86" };
      return { fix: "Summary ItemList (name + URL) of the linked pages", priority: "P3", risk: "Low", approval: "No" };
    case "primary-cta":
      return { fix: "Add a next-step block (models / quote / contact)", priority: "P2", risk: "Low", approval: "No" };
    case "direct-contact-in-content":
      return { fix: "Phone / WhatsApp in the page body (header & floating button already exist)", priority: "P3", risk: "Low", approval: "No" };
    case "verifiable-specs":
      return { fix: "Link or summarise verified specifications", priority: "P3", risk: "Low", approval: "No" };
    case "project-evidence":
      return { fix: "Verified project / case-study module — needs owner-approved projects, photos and permissions", priority: "P3", risk: "Low", approval: "Owner evidence" };
    case "no-conflicting-rupee":
      return { fix: r.commerce?.fed ? "Remove the second ₹ figure from the Merchant landing page" : "Second ₹ figure on a non-fed page — review wording", priority: r.commerce?.fed ? "P1" : "P3", risk: "High", approval: "Owner + protected Merchant flow" };
    case "no-rupee-on-city-page":
      return { fix: "Remove ₹ figures (city-page rule)", priority: "P1", risk: "Low", approval: "No" };
    default:
      return { fix: c.detail, priority: "P2", risk: "Medium", approval: "Review" };
  }
}

function rollUp(r: PageRecord) {
  for (const dim of ["SEO", "AEO", "GEO", "AIO", "SXO"] as const) {
    const cs = r.checks.filter((c) => c.dim === dim);
    if (!cs.length) { r.status[dim] = "Not applicable"; continue; }
    const failed = cs.filter((c) => !c.ok);
    if (!failed.length) r.status[dim] = "Already implemented";
    // Missing project evidence is a business-evidence gap, not a code gap: it cannot be fixed by
    // writing copy, only by the owner supplying verified projects.
    else if (failed.every((c) => c.id === "project-evidence")) r.status[dim] = "Requires verification";
    else if (failed.length === cs.length) r.status[dim] = "Missing";
    else r.status[dim] = "Needs improvement";
  }
}

/** Short list of what the page already has — the "Existing Features" column. */
function existing(r: PageRecord): string {
  const f: string[] = [];
  if (r.commerce?.purchasable) f.push(r.commerce.outright ? "fixed GST-incl. price + cart" : "online booking");
  if (r.commerce?.fed) f.push("Merchant feed");
  if (r.faqVisible.length) f.push(`FAQ×${r.faqVisible.length}`);
  for (const t of ["Product", "ProductGroup", "FAQPage", "ItemList", "BreadcrumbList", "Organization", "LocalBusiness", "Service", "Article", "BlogPosting"]) if (r.ldTypes.includes(t)) f.push(t);
  if (r.signals.specTable) f.push("specs");
  if (r.signals.comparison) f.push("comparison");
  if (r.ctas.form) f.push("form");
  if (r.ctas.tel || r.ctas.whatsapp) f.push("call/WhatsApp");
  f.push(`${r.internalLinks.length} content links`);
  return f.join(", ");
}

/* ─────────────────────────────────────────── cross-page ─────────────────────────────────────── */

const shingles = (text: string, n = 8) => {
  const w = text.toLowerCase().replace(/[^a-z0-9₹ ]+/g, " ").split(/\s+/).filter(Boolean);
  const s = new Set<string>();
  for (let i = 0; i + n <= w.length; i++) s.add(w.slice(i, i + n).join(" "));
  return s;
};
const jaccard = (a: Set<string>, b: Set<string>) => {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
};

/** Head term × place from an H1, e.g. "Container Office in Chennai" → ["container office", "chennai"]. */
function keywordOf(h1: string): { term: string; place: string } {
  const clean = h1.toLowerCase().replace(/\s[–—|:]\s.*$/, "").replace(/:.*$/, "").replace(/[^a-z0-9 ,+&]+/g, " ").replace(/\s+/g, " ").trim();
  const m = clean.match(/^(.*?)\s+(?:in|near|for|at)\s+(.+)$/);
  return m ? { term: m[1].trim(), place: m[2].replace(/,.*$/, "").trim() } : { term: clean, place: "" };
}

/* ───────────────────────────────────────────── fetch ────────────────────────────────────────── */

async function fetchText(url: string): Promise<{ status: number; html: string; location?: string }> {
  const res = await fetch(url, { redirect: "manual", headers: { "user-agent": UA, accept: "text/html,application/xml" } });
  const html = await res.text();
  return { status: res.status, html, location: res.headers.get("location") ?? undefined };
}

async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

/* ───────────────────────────────────────────── main ─────────────────────────────────────────── */

async function main() {
  const sm = await fetchText(`${origin}/sitemap.xml`);
  if (sm.status !== 200) throw new Error(`sitemap answered ${sm.status}`);
  const locs = allMatches(sm.html, /<loc>([^<]+)<\/loc>/g).map((u) => decode(u).trim());
  const paths = Array.from(new Set(locs.map((u) => u.replace(PROD_HOST, "").replace(/\/$/, "") || "/"))).filter((p) => !only || p.startsWith(only));
  console.log(`sitemap: ${locs.length} <loc>, ${paths.length} unique paths${only ? ` under ${only}` : ""}`);

  const mainTexts = new Map<string, string>();
  const records = await pool(paths, concurrency, async (path) => {
    const url = `${origin}${path === "/" ? "/" : path}`;
    const { status, html, location } = await fetchText(url);
    const s = html.replace(/<script[\s\S]*?<\/script>/gi, "");
    const a = s.search(/<main\b/i), b = s.lastIndexOf("</main>");
    mainTexts.set(path, textOf(a >= 0 ? s.slice(a, b > a ? b : undefined) : s));
    return parsePage(url, path, status, html, location);
  });

  records.forEach(evaluate);

  // in-degree from <main> links (header / footer / floating buttons excluded on purpose: they link everything)
  const inDeg = new Map<string, Set<string>>();
  for (const r of records) for (const l of r.internalLinks) if (l !== r.path) (inDeg.get(l) ?? inDeg.set(l, new Set()).get(l)!).add(r.path);
  for (const r of records) {
    r.inDegreeMain = inDeg.get(r.path)?.size ?? 0;
    if (r.type !== "home") add(r, "SEO", r.inDegreeMain > 0, "linked-from-content", `${r.inDegreeMain} pages link here from <main>`);
  }

  // similarity within a type
  const sh = new Map<string, Set<string>>();
  for (const r of records) if (["city", "promotion", "product", "category", "product-guide"].includes(r.type)) sh.set(r.path, shingles(mainTexts.get(r.path) ?? ""));
  for (const r of records) {
    const mine = sh.get(r.path);
    if (!mine) continue;
    let best = { path: "", score: 0 };
    for (const o of records) {
      if (o === r || o.type !== r.type) continue;
      const theirs = sh.get(o.path);
      if (!theirs) continue;
      const s = jaccard(mine, theirs);
      if (s > best.score) best = { path: o.path, score: Math.round(s * 1000) / 1000 };
    }
    r.maxSimilarity = best;
    add(r, "SEO", best.score < SIMILARITY_FLAG, "distinct-content", `max 8-word shingle overlap ${best.score} with ${best.path || "—"}`);
  }

  // FAQ reuse
  const faqPages = new Map<string, Set<string>>();
  const norm = (q: string) => q.toLowerCase().replace(/\s+/g, " ");
  for (const r of records) for (const q of r.faqVisible) (faqPages.get(norm(q)) ?? faqPages.set(norm(q), new Set()).get(norm(q))!).add(r.path);
  const reusedFaqs = Array.from(faqPages.entries()).filter(([, s]) => s.size >= FAQ_REUSE_PAGES).sort((a, b) => b[1].size - a[1].size);
  for (const r of records) {
    const reused = r.faqVisible.filter((q) => (faqPages.get(norm(q))?.size ?? 0) >= FAQ_REUSE_PAGES);
    if (r.faqVisible.length) add(r, "AEO", reused.length <= r.faqVisible.length / 2, "faq-originality", `${reused.length}/${r.faqVisible.length} questions also on ≥${FAQ_REUSE_PAGES} pages`);
  }

  records.forEach(rollUp);

  // duplicates among indexable pages
  const idx = records.filter((r) => r.httpStatus === 200 && !/noindex/i.test(r.robots));
  const dupOf = (key: (r: PageRecord) => string) => {
    const m = new Map<string, string[]>();
    for (const r of idx) { const k = key(r).toLowerCase().trim(); if (k) (m.get(k) ?? m.set(k, []).get(k)!).push(r.path); }
    return Array.from(m.entries()).filter(([, v]) => v.length > 1);
  };
  const dupTitles = dupOf((r) => r.title), dupDesc = dupOf((r) => r.description), dupH1 = dupOf((r) => r.h1[0] ?? "");

  // keyword map: head term × place over every commercial page
  const kw = new Map<string, { term: string; place: string; pages: { path: string; type: PageType }[] }>();
  for (const r of idx) {
    if (!r.h1[0] || ["policy", "static", "blog", "home", "directory"].includes(r.type)) continue;
    const { term, place } = keywordOf(r.h1[0]);
    const k = `${term}|${place}`;
    (kw.get(k) ?? kw.set(k, { term, place, pages: [] }).get(k)!).pages.push({ path: r.path, type: r.type });
  }
  const keywordMap = Array.from(kw.values()).sort((a, b) => a.term.localeCompare(b.term) || a.place.localeCompare(b.place));
  const collisions = keywordMap.filter((g) => g.pages.length > 1);

  const catalogue = products.map((p) => {
    const c = getCommerce(p.id);
    const r = records.find((x) => x.path === getProductDetailPath(p));
    return {
      id: p.id, sku: c?.sku, path: getProductDetailPath(p), category: p.categorySlug, purchasable: isPurchasable(p.id),
      fed: c ? fedSkus.has(c.sku) : false, sellPrice: c ? sellPrice(c.basePrice) : undefined,
      inSitemap: !!r, ldPrice: r?.productLd?.price,
    };
  });

  mkdirSync(outDir, { recursive: true });
  const countBy = <T,>(xs: T[], key: (x: T) => string) => xs.reduce<Record<string, number>>((acc, x) => ({ ...acc, [key(x)]: (acc[key(x)] ?? 0) + 1 }), {});
  const summary = {
    origin, generated: new Date().toISOString(), pages: records.length,
    byType: countBy(records, (r) => r.type),
    statusCounts: Object.fromEntries((["SEO", "AEO", "GEO", "AIO", "SXO"] as const).map((d) => [d, countBy(records, (r) => r.status[d])])),
    failingChecks: Object.entries(countBy(records.flatMap((r) => r.checks.filter((c) => !c.ok)), (c) => `${c.dim}:${c.id}`)).sort((a, b) => b[1] - a[1]),
    dupTitles, dupDesc, dupH1, collisions,
    reusedFaqs: reusedFaqs.map(([q, s]) => ({ question: q, pages: s.size })),
    feedCount: fedSkus.size, catalogueProducts: products.length, categories: categories.length, cityPages: CITY_PAGES.length,
    containerCluster: CITY_PAGES.filter((c) => containerOfficeLocation(c.slug)).length,
  };
  writeFileSync(join(outDir, "inventory.json"), JSON.stringify({ summary, catalogue, keywordMap, records }, null, 2));

  // Matrix rows in the audit brief's column order.
  const rows = records.map((r) => {
    const failed = r.checks.filter((c) => !c.ok);
    const recs = failed.map((c) => ({ c, rec: recommend(r, c) }));
    const rank = { P1: 1, P2: 2, P3: 3 } as const;
    const riskRank = { Low: 1, Medium: 2, High: 3 } as const;
    return {
      url: r.path, type: r.type, intent: r.intent,
      SEO: r.status.SEO, AEO: r.status.AEO, GEO: r.status.GEO, AIO: r.status.AIO, SXO: r.status.SXO,
      existing: existing(r),
      missing: failed.map((c) => `${c.dim}:${c.id} (${c.detail})`).join("; "),
      fix: Array.from(new Set(recs.map((x) => x.rec.fix))).join(" / "),
      priority: recs.length ? recs.map((x) => x.rec.priority).sort((a, b) => rank[a] - rank[b])[0] : "—",
      risk: recs.length ? recs.map((x) => x.rec.risk).sort((a, b) => riskRank[b] - riskRank[a])[0] : "—",
      approval: Array.from(new Set(recs.map((x) => x.rec.approval).filter((a) => a !== "No"))).join("; ") || (recs.length ? "No" : "—"),
    };
  });
  const cols = ["url", "type", "intent", "SEO", "AEO", "GEO", "AIO", "SXO", "existing", "missing", "fix", "priority", "risk", "approval"] as const;
  const head = ["URL", "Page Type", "Search Intent", "SEO", "AEO", "GEO", "AIO", "SXO", "Existing Features", "Missing Features", "Recommended Fix", "Priority", "Risk", "Approval Needed"];
  const csvCell = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
  writeFileSync(join(outDir, "inventory.csv"), [head.map(csvCell).join(","), ...rows.map((row) => cols.map((k) => csvCell(row[k])).join(","))].join("\n") + "\n");

  const esc = (s: string) => String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");
  const md: string[] = [
    `# Site inventory — ${origin}`, "",
    `Generated ${summary.generated} by \`npm run seo:inventory\` from ${records.length} sitemap URLs.`, "",
    "## Page matrix", "",
    `| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`,
    ...rows.map((row) => `| ${cols.map((k) => esc(row[k])).join(" | ")} |`),
    "", "## Keyword map (head term × place, indexable commercial pages)", "",
    "| Head term | Place | Pages |", "|---|---|---|",
    ...keywordMap.map((g) => `| ${esc(g.term)} | ${esc(g.place || "—")} | ${g.pages.map((p) => `${p.path} (${p.type})`).join("<br>")} |`),
    "", "## Templated FAQ questions", "",
    "| Question | Pages |", "|---|---|",
    ...summary.reusedFaqs.map((q) => `| ${esc(q.question)} | ${q.pages} |`),
  ];
  writeFileSync(join(outDir, "inventory.md"), md.join("\n") + "\n");

  console.log(JSON.stringify({ byType: summary.byType, statusCounts: summary.statusCounts }, null, 1));
  console.log("failing checks:", summary.failingChecks);
  console.log(`duplicate titles ${dupTitles.length}, descriptions ${dupDesc.length}, H1s ${dupH1.length}; keyword collisions ${collisions.length}; FAQ questions on ≥${FAQ_REUSE_PAGES} pages: ${reusedFaqs.length}`);
  console.log(`written: ${outDir}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
