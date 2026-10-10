/**
 * CITY PAGE SSR / FOLD AUDIT — proves that every piece of essential SEO content on a
 * /cities-we-serve/<slug> page is present in the INITIAL server HTML, exactly as a crawler that
 * executes no JavaScript receives it.
 *
 *   npx tsx scripts/city-page-ssr-audit.ts <origin> [slug ...] [--dom] [--json <file>] [--verbose]
 *
 *   <origin>   http://localhost:3002 (a `next start` of the production build) or
 *              https://portableofficecabin.com (the live site) — the same checks run against both.
 *   slug ...   defaults to every entry in src/data/cityPages.ts.
 *   --dom      also render each page in headless Chrome (JavaScript ON) and report any essential
 *              item that exists only after hydration ("CSR-only"). Needs Chrome or Edge installed.
 *   --json     write the full per-page results to a file.
 *
 * WHAT IS MEASURED
 *   The expected content is derived from the page's own data entry (src/data/cityPages.ts), so the
 *   audit cannot drift from the template: H1, tagline, intro paragraphs, every section heading,
 *   intro, bullet title + text, specification line, FAQ question + answer, CTA copy and buttons,
 *   related links, disclaimer, image sources + alt text + caption, contact details, breadcrumb,
 *   <title>, meta description, canonical, og:image and the FAQPage / BreadcrumbList JSON-LD.
 *
 *   • "server coverage"  = items found in the server HTML with every <script> block removed (the
 *                          RSC payload inside <script> is NOT counted), divided by all items.
 *   • "fold coverage"    = the same for the above-the-fold subset: breadcrumb trail, H1, tagline,
 *                          hero image (src, alt, eager/high-priority loading) and the first intro
 *                          paragraph.
 *   • "CSR-only"         = (with --dom) items absent from the server HTML but present in the
 *                          JavaScript-rendered DOM, divided by all items. Without --dom the
 *                          audit still proves the server side; it just cannot observe hydration.
 *   Hydration scripts and optional UI interactivity are never counted as content.
 *
 * Exit code 1 when any page fails any check, so it can gate CI like scripts/robots-policy.test.ts.
 */

import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";

import { CITY_PAGES, type CityPage } from "../src/data/cityPages";
import { COMPANY } from "../src/lib/company";

/* ------------------------------------------------------------------ args --------------------- */

const argv = process.argv.slice(2);
const origin = (argv.find((a) => a.startsWith("http")) ?? "").replace(/\/$/, "");
if (!origin) {
  console.error("usage: npx tsx scripts/city-page-ssr-audit.ts <origin> [slug ...] [--dom] [--json file]");
  process.exit(2);
}
const wantDom = argv.includes("--dom");
const verbose = argv.includes("--verbose");
const jsonOut = argv.includes("--json") ? argv[argv.indexOf("--json") + 1] : undefined;
const slugArgs = argv.filter((a) => !a.startsWith("http") && !a.startsWith("--") && a !== jsonOut);
const pages = slugArgs.length ? CITY_PAGES.filter((p) => slugArgs.includes(p.slug)) : CITY_PAGES;
if (slugArgs.length && pages.length !== slugArgs.length) {
  console.error("unknown slug(s): " + slugArgs.filter((s) => !pages.some((p) => p.slug === s)).join(", "));
  process.exit(2);
}

const UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

/* ------------------------------------------------------------------ text normalisation ------- */

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
}
const squash = (s: string) => s.replace(/\s+/g, " ").trim();

/** Server HTML minus every <script> (RSC payload, hydration) and HTML comments (React text joins). */
function stripScripts(html: string): string {
  return html.replace(/<script\b[\s\S]*?<\/script>/gi, "").replace(/<!--[\s\S]*?-->/g, "");
}
/** Visible-ish text of a document: tags removed, entities decoded, whitespace squashed. */
function textOf(html: string): string {
  return squash(decodeEntities(stripScripts(html).replace(/<[^>]+>/g, " ")));
}
/** Attribute-level search space: scripts/comments removed, entities decoded, whitespace squashed. */
function markupOf(html: string): string {
  return squash(decodeEntities(stripScripts(html)));
}

/* ------------------------------------------------------------------ expected items ----------- */

interface Item {
  group: string;
  label: string;
  /** what must appear in the visible text (after normalisation) … */
  text?: string;
  /** … or in the markup (attributes, hrefs) */
  markup?: string;
  /** custom predicate over (markup, text) for structural checks */
  test?: (markup: string, text: string) => boolean;
  fold?: boolean;
}

function imageNeedle(src: string): RegExp {
  // next/image rewrites the src through /_next/image?url=<encoded>&w=…; the raw path also appears
  // when images are unoptimized. Accept either.
  const enc = encodeURIComponent(src).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const raw = src.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(${enc}|${raw})`);
}

function expectedItems(p: CityPage, pageUrl: string): Item[] {
  const items: Item[] = [];
  const t = (group: string, label: string, text: string, fold = false) =>
    items.push({ group, label, text: squash(text), fold });
  const m = (group: string, label: string, markup: string, fold = false) =>
    items.push({ group, label, markup: squash(markup), fold });

  // metadata
  items.push({ group: "metadata", label: "<title> = metaTitle", test: (mk) => mk.includes(`<title>${squash(p.metaTitle)}</title>`) });
  m("metadata", "meta description = metaDescription", `name="description" content="${p.metaDescription}"`);
  m("metadata", "canonical = page URL", `rel="canonical" href="${pageUrl}"`);
  m("metadata", "og:url = page URL", `property="og:url" content="${pageUrl}"`);
  items.push({ group: "metadata", label: "og:image = hero image", test: (mk) => new RegExp(`property="og:image" content="[^"]*${p.heroImage.src.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`).test(mk) });
  items.push({ group: "metadata", label: "no noindex robots meta", test: (mk) => !/name="robots" content="[^"]*noindex/i.test(mk) });
  m("metadata", "geo.region", `name="geo.region" content="${p.geo.region}"`);

  // above the fold
  t("fold", "breadcrumb: Home", "Home", true);
  t("fold", "breadcrumb: Cities We Serve", "Cities We Serve", true);
  t("fold", "H1", p.h1, true);
  items.push({ group: "fold", label: "H1 is an <h1>", fold: true, test: (mk) => new RegExp(`<h1[^>]*>${squash(p.h1).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</h1>`).test(mk) });
  t("fold", "tagline", p.tagline, true);
  items.push({ group: "fold", label: "hero image src", fold: true, test: (mk) => imageNeedle(p.heroImage.src).test(mk) });
  m("fold", "hero image alt", `alt="${p.heroImage.alt}"`, true);
  items.push({
    group: "fold",
    label: "hero image not lazy (LCP priority: preload link / eager / fetchpriority high)",
    fold: true,
    test: (mk) => {
      // next/image `priority` renders the <img> WITHOUT loading="lazy" and emits a
      // <link rel="preload" as="image" imagesrcset=…> for it; some versions also add
      // fetchpriority="high" or loading="eager" on the tag. Any of those proves LCP priority;
      // loading="lazy" on the hero is always a failure.
      const enc = encodeURIComponent(p.heroImage.src).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const raw = p.heroImage.src.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const tag = mk.match(new RegExp(`<img[^>]*(${enc}|${raw})[^>]*>`));
      if (!tag) return false;
      const img = tag[0];
      if (/loading="lazy"/i.test(img)) return false;
      const preloaded = new RegExp(`<link[^>]*rel="preload"[^>]*as="image"[^>]*(${enc}|${raw})`, "i").test(mk);
      return preloaded || /fetchpriority="high"/i.test(img) || /loading="eager"/i.test(img);
    },
  });
  items.push({ group: "fold", label: "hero image has width+height", fold: true, test: (mk) => { const tag = mk.match(new RegExp(`<img[^>]*(${encodeURIComponent(p.heroImage.src).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})[^>]*>`)); return !!tag && /width="\d+"/.test(tag[0]) && /height="\d+"/.test(tag[0]); } });
  t("fold", "intro paragraph 1", p.intro[0], true);

  // body copy
  p.intro.slice(1).forEach((s, i) => t("intro", `intro paragraph ${i + 2}`, s));
  t("why", "why heading", p.whyHeading);
  t("why", "why intro", p.whyIntro);
  p.whyBullets.forEach((b, i) => { t("why", `why bullet ${i + 1} title`, b.title ?? ""); t("why", `why bullet ${i + 1} text`, b.text); });
  if (p.whyOutro) t("why", "why outro", p.whyOutro);
  if (p.featureImage) {
    items.push({ group: "images", label: "feature image src", test: (mk) => imageNeedle(p.featureImage!.src).test(mk) });
    m("images", "feature image alt", `alt="${p.featureImage.alt}"`);
    t("images", "feature image caption", p.featureImage.caption);
  }
  t("solutions", "solutions heading", p.solutionsHeading);
  t("solutions", "solutions intro", p.solutionsIntro);
  p.solutions.forEach((s, i) => { t("solutions", `layout ${i + 1} title`, s.title ?? ""); t("solutions", `layout ${i + 1} text`, s.text); });
  t("features", "features heading", p.featuresHeading);
  t("features", "features intro", p.featuresIntro);
  p.features.forEach((f, i) => t("features", `feature line ${i + 1}`, f));
  t("features", "sizes note", p.sizesNote);
  p.gallery?.forEach((g, i) => { items.push({ group: "images", label: `gallery ${i + 1} src`, test: (mk) => imageNeedle(g.src).test(mk) }); m("images", `gallery ${i + 1} alt`, `alt="${g.alt}"`); });
  t("industries", "industries heading", p.industriesHeading);
  t("industries", "industries intro", p.industriesIntro);
  p.industries.forEach((b, i) => { t("industries", `industry ${i + 1} title`, b.title ?? ""); t("industries", `industry ${i + 1} text`, b.text); });
  t("custom", "custom heading", p.customHeading);
  if (p.interiorImage) { items.push({ group: "images", label: "interior image src", test: (mk) => imageNeedle(p.interiorImage!.src).test(mk) }); m("images", "interior image alt", `alt="${p.interiorImage.alt}"`); }
  t("custom", "custom intro", p.customIntro);
  p.customBullets.forEach((b, i) => { t("custom", `custom bullet ${i + 1} title`, b.title ?? ""); t("custom", `custom bullet ${i + 1} text`, b.text); });
  t("custom", "custom outro", p.customOutro);
  t("whyUs", "why-us heading", p.whyUsHeading);
  t("whyUs", "why-us intro", p.whyUsIntro);
  p.whyUsBullets.forEach((b, i) => { t("whyUs", `why-us bullet ${i + 1} title`, b.title ?? ""); t("whyUs", `why-us bullet ${i + 1} text`, b.text); });
  t("areas", "areas heading", p.areasHeading);
  t("areas", "areas text", p.areasText);
  t("how", "how heading", p.howHeading);
  p.howSteps.forEach((s, i) => { t("how", `step ${i + 1} title`, s.title ?? ""); t("how", `step ${i + 1} text`, s.text); });
  t("faq", "FAQ section heading", "Frequently Asked Questions");
  p.faqs.forEach((f, i) => { t("faq", `FAQ ${i + 1} question`, f.question); t("faq", `FAQ ${i + 1} answer`, f.answer); });
  t("cta", "CTA heading", p.ctaHeading);
  t("cta", "CTA text", p.ctaText);
  t("cta", "CTA button", p.ctaButtonLabel ?? "Get a Free Quotation");
  m("cta", "CTA button → /contact", `href="/contact"`);
  (p.ctaSecondaryLinks ?? [{ label: "Explore Container Offices", href: "/products" }, { label: "Container Office on Rent", href: "/rental-service" }]).forEach((l) => { t("cta", `secondary button "${l.label}"`, l.label); m("cta", `secondary href ${l.href}`, `href="${l.href}"`); });
  p.relatedLinks?.forEach((l) => { t("links", `related "${l.label}"`, l.label); m("links", `related href ${l.href}`, `href="${l.href}"`); });
  if (p.disclaimer) t("legal", "disclaimer", p.disclaimer);

  // contact details rendered by the layout (footer) — the page must not depend on JS for them
  t("contact", "phone (footer/CTA)", COMPANY.phones[0].display);
  t("contact", "sales email", COMPANY.email.sales);

  // structured data
  items.push({ group: "jsonld", label: "FAQPage JSON-LD matches the FAQ list", test: (_mk, _t) => false }); // replaced below
  items.push({ group: "jsonld", label: "BreadcrumbList JSON-LD ends at this page", test: (_mk, _t) => false }); // replaced below
  return items;
}

/** JSON-LD is inside <script>, so it is checked on the RAW html, not the script-stripped text. */
function checkJsonLd(html: string, p: CityPage, pageUrl: string): { faq: boolean; breadcrumb: boolean; detail: string } {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  let faq = false;
  let breadcrumb = false;
  const notes: string[] = [];
  for (const b of blocks) {
    let j: unknown;
    try { j = JSON.parse(b); } catch { notes.push("invalid JSON-LD block"); continue; }
    const node = j as { "@type"?: string; mainEntity?: { name: string; acceptedAnswer?: { text: string } }[]; itemListElement?: { name: string; item?: string }[] };
    if (node["@type"] === "FAQPage" && Array.isArray(node.mainEntity)) {
      const names = node.mainEntity.map((q) => squash(q.name));
      const sameCount = names.length === p.faqs.length;
      const allMatch = p.faqs.every((f, i) => names[i] === squash(f.question) && squash(node.mainEntity![i].acceptedAnswer?.text ?? "") === squash(f.answer));
      faq = sameCount && allMatch;
      if (!faq) notes.push(`FAQPage has ${names.length} questions, data has ${p.faqs.length}${sameCount ? ", text mismatch" : ""}`);
    }
    if (node["@type"] === "BreadcrumbList" && Array.isArray(node.itemListElement)) {
      const last = node.itemListElement[node.itemListElement.length - 1];
      breadcrumb = node.itemListElement.length === 3 && last?.item === pageUrl && squash(last?.name ?? "") === squash(p.metaTitle);
      if (!breadcrumb) notes.push(`BreadcrumbList last item: ${last?.item} (${last?.name})`);
    }
  }
  if (!blocks.length) notes.push("no JSON-LD blocks");
  return { faq, breadcrumb, detail: notes.join("; ") };
}

/* ------------------------------------------------------------------ fetch helpers ------------ */

async function fetchHtml(url: string): Promise<{ status: number; html: string; headers: Headers }> {
  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "manual" });
  return { status: res.status, html: await res.text(), headers: res.headers };
}

async function headStatus(url: string): Promise<number> {
  try {
    const res = await fetch(url, { method: "GET", headers: { "User-Agent": UA }, redirect: "manual" });
    return res.status;
  } catch {
    return 0;
  }
}

function chromePath(): string | undefined {
  const candidates = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].filter(Boolean) as string[];
  return candidates.find((c) => existsSync(c));
}

/** JavaScript-rendered DOM (hydrated) via headless Chrome. */
function renderedDom(url: string): string | undefined {
  const chrome = chromePath();
  if (!chrome) return undefined;
  try {
    return execFileSync(
      chrome,
      ["--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars", "--virtual-time-budget=8000", "--dump-dom", url],
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"], timeout: 60000 },
    );
  } catch {
    return undefined;
  }
}

/* ------------------------------------------------------------------ audit one page ----------- */

interface PageResult {
  slug: string;
  url: string;
  status: number;
  cache: string;
  items: number;
  found: number;
  serverCoveragePct: number;
  foldItems: number;
  foldFound: number;
  foldCoveragePct: number;
  csrOnlyPct: number | null;
  csrOnlyItems: string[];
  metadataOk: boolean;
  jsonLdOk: boolean;
  heroOk: boolean;
  linksChecked: number;
  linksBroken: string[];
  imagesChecked: number;
  imagesBroken: string[];
  missing: string[];
  jsonLdDetail: string;
  pass: boolean;
}

async function auditPage(p: CityPage): Promise<PageResult> {
  const path = `/cities-we-serve/${p.slug}`;
  const url = origin + path;
  const canonicalUrl = `https://portableofficecabin.com${path}`;
  const { status, html, headers } = await fetchHtml(url);
  const mk = markupOf(html);
  const tx = textOf(html);
  const items = expectedItems(p, canonicalUrl);
  const ld = checkJsonLd(html, p, canonicalUrl);
  // splice the two structural JSON-LD results in
  items[items.length - 2].test = () => ld.faq;
  items[items.length - 1].test = () => ld.breadcrumb;

  const evaluate = (mkSrc: string, txSrc: string) =>
    items.map((it) => {
      let ok = false;
      if (it.test) ok = it.test(mkSrc, txSrc);
      else if (it.text !== undefined) ok = txSrc.includes(it.text);
      else if (it.markup !== undefined) ok = mkSrc.includes(it.markup);
      return ok;
    });
  const serverOk = evaluate(mk, tx);
  const found = serverOk.filter(Boolean).length;
  const foldIdx = items.map((it, i) => (it.fold ? i : -1)).filter((i) => i >= 0);
  const foldFound = foldIdx.filter((i) => serverOk[i]).length;
  const missing = items.filter((_, i) => !serverOk[i]).map((it) => `${it.group}: ${it.label}`);

  // links: every internal href on the page (outside scripts) must resolve on the same origin
  const hrefs = [...new Set([...mk.matchAll(/href="(\/[^"#?]*)"/g)].map((m) => m[1]))].filter((h) => !h.startsWith("/_next/"));
  const linksBroken: string[] = [];
  for (const h of hrefs) {
    const s = await headStatus(origin + h);
    if (s !== 200) linksBroken.push(`${h} → ${s}`);
  }
  // images: every page-data image must be fetchable as the raw file and through the optimizer URL used in the HTML
  const imgSrcs = [p.heroImage.src, p.featureImage?.src, p.interiorImage?.src, ...(p.gallery ?? []).map((g) => g.src)].filter(Boolean) as string[];
  const imagesBroken: string[] = [];
  for (const src of imgSrcs) {
    const s = await headStatus(origin + src);
    if (s !== 200) imagesBroken.push(`${src} → ${s}`);
    const opt = mk.match(new RegExp(`src="(/_next/image\\?url=${encodeURIComponent(src).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^"]*)"`));
    if (opt) {
      const so = await headStatus(origin + decodeEntities(opt[1]));
      if (so !== 200) imagesBroken.push(`${opt[1]} → ${so}`);
    }
  }

  // hydrated DOM (optional): essential items that exist only after JavaScript
  let csrOnlyPct: number | null = null;
  const csrOnlyItems: string[] = [];
  if (wantDom) {
    const dom = renderedDom(url);
    if (dom) {
      const domOk = evaluate(markupOf(dom), textOf(dom));
      items.forEach((it, i) => { if (!serverOk[i] && domOk[i]) csrOnlyItems.push(`${it.group}: ${it.label}`); });
      csrOnlyPct = Math.round((csrOnlyItems.length / items.length) * 10000) / 100;
    }
  }

  const metadataOk = items.filter((it) => it.group === "metadata").every((it) => serverOk[items.indexOf(it)]);
  const heroOk = items.filter((it) => it.label.startsWith("hero image")).every((it) => serverOk[items.indexOf(it)]);
  const pass = status === 200 && found === items.length && linksBroken.length === 0 && imagesBroken.length === 0 && ld.faq && ld.breadcrumb;
  return {
    slug: p.slug,
    url,
    status,
    cache: headers.get("x-nextjs-cache") ?? headers.get("cache-control") ?? "",
    items: items.length,
    found,
    serverCoveragePct: Math.round((found / items.length) * 10000) / 100,
    foldItems: foldIdx.length,
    foldFound,
    foldCoveragePct: Math.round((foldFound / foldIdx.length) * 10000) / 100,
    csrOnlyPct,
    csrOnlyItems,
    metadataOk,
    jsonLdOk: ld.faq && ld.breadcrumb,
    heroOk,
    linksChecked: hrefs.length,
    linksBroken,
    imagesChecked: imgSrcs.length,
    imagesBroken,
    missing,
    jsonLdDetail: ld.detail,
    pass,
  };
}

/* ------------------------------------------------------------------ main --------------------- */

(async () => {
  console.log(`city-page SSR/fold audit against ${origin} — ${pages.length} page(s)${wantDom ? " (+ headless DOM comparison)" : ""}\n`);
  const results: PageResult[] = [];
  for (const p of pages) {
    const r = await auditPage(p);
    results.push(r);
    const tag = r.pass ? "PASS" : "FAIL";
    console.log(
      `${tag}  ${r.slug}\n` +
        `      status ${r.status} (${r.cache || "no cache header"}) | server ${r.found}/${r.items} = ${r.serverCoveragePct}% | fold ${r.foldFound}/${r.foldItems} = ${r.foldCoveragePct}%` +
        ` | CSR-only ${r.csrOnlyPct === null ? "n/a (no --dom)" : r.csrOnlyPct + "%"}\n` +
        `      metadata ${r.metadataOk ? "ok" : "FAIL"} | JSON-LD ${r.jsonLdOk ? "ok" : "FAIL " + r.jsonLdDetail} | hero ${r.heroOk ? "ok" : "FAIL"} | links ${r.linksChecked} checked, ${r.linksBroken.length} broken | images ${r.imagesChecked} checked, ${r.imagesBroken.length} broken`,
    );
    if (r.missing.length) console.log("      missing in server HTML: " + r.missing.slice(0, 12).join(" · ") + (r.missing.length > 12 ? ` … (+${r.missing.length - 12})` : ""));
    if (r.csrOnlyItems.length) console.log("      CSR-only: " + r.csrOnlyItems.join(" · "));
    if (r.linksBroken.length) console.log("      broken links: " + r.linksBroken.join(" · "));
    if (r.imagesBroken.length) console.log("      broken images: " + r.imagesBroken.join(" · "));
    if (verbose) console.log("      items: " + r.items + ", groups: " + [...new Set(expectedItems(p, "").map((i) => i.group))].join(", "));
  }
  if (jsonOut) writeFileSync(jsonOut, JSON.stringify(results, null, 2));
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} pages passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
