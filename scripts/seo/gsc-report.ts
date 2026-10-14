/**
 * SEARCH CONSOLE PAGE-GROUP REPORT — turns a Google Search Console "Pages" export into the page-group
 * baseline the 5-in-1 audit asks for, and compares two periods like for like.
 *
 *   npm run seo:gsc-report -- <pages.csv> [<later-pages.csv>] [--top N] [--json <file>]
 *
 *   <pages.csv>   Search Console → Performance → Search results → (date range) → PAGES tab → Export →
 *                 CSV (or the "Pages.csv" inside the exported zip). Columns: Top pages, Clicks,
 *                 Impressions, CTR, Position — header names are matched loosely, so the Google
 *                 Sheets / Excel variants work too.
 *   <later.csv>   optional second export of an equally long, later window: adds the change per group
 *                 and lists the pages that lost the most clicks / impressions.
 *
 * Groups come from scripts/seo/page-groups.ts — the same classification as the site inventory, so
 * "Container-office city pages" means the same set in both reports. Nothing here is estimated:
 * every figure is a sum (clicks, impressions) or an impression-weighted mean (position) of the rows
 * Search Console exported. Read-only; no network access.
 */
import { readFileSync, writeFileSync } from "node:fs";

import { PAGE_GROUPS, normalisePath, pageGroup, type PageGroup } from "./page-groups";

interface Row { path: string; clicks: number; impressions: number; position: number }
interface GroupStats { pages: number; clicks: number; impressions: number; ctr: number; position: number }

/* ───────────────────────────────────────────── args ─────────────────────────────────────────── */

const argv = process.argv.slice(2);
const flag = (name: string) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
const jsonOut = flag("--json");
const top = Number(flag("--top") ?? 10);
const files = argv.filter((a, i) => !a.startsWith("--") && argv[i - 1] !== "--json" && argv[i - 1] !== "--top");
if (files.length < 1 || files.length > 2) {
  console.error("usage: npm run seo:gsc-report -- <pages.csv> [<later-pages.csv>] [--top N] [--json file]");
  process.exit(2);
}

/* ───────────────────────────────────────────── csv ──────────────────────────────────────────── */

/** RFC 4180 CSV (quoted fields, doubled quotes, CRLF), enough for Search Console exports. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

/** "1,234" / "1.2%" / "8.4" → number. */
const num = (s: string) => Number(String(s).replace(/[,%\s]/g, "")) || 0;

function readExport(file: string): Row[] {
  const [header, ...body] = parseCsv(readFileSync(file, "utf8"));
  if (!header) throw new Error(`${file}: empty file`);
  const col = (re: RegExp) => header.findIndex((h) => re.test(h.trim()));
  const iPage = col(/page|url/i), iClicks = col(/^clicks$/i), iImpr = col(/^impressions$/i), iPos = col(/position/i);
  if (iPage < 0 || iClicks < 0 || iImpr < 0 || iPos < 0) {
    throw new Error(`${file}: expected a Search Console PAGES export (Top pages, Clicks, Impressions, CTR, Position); got ${header.join(" | ")}`);
  }
  // Several exported URLs can collapse to one path (http/https, www, trailing slash, ?page=): merge them.
  const byPath = new Map<string, Row>();
  for (const r of body) {
    const path = normalisePath(r[iPage] ?? "");
    const clicks = num(r[iClicks]), impressions = num(r[iImpr]), position = num(r[iPos]);
    const prev = byPath.get(path);
    if (!prev) byPath.set(path, { path, clicks, impressions, position });
    else {
      const totalImpr = prev.impressions + impressions;
      prev.position = totalImpr ? (prev.position * prev.impressions + position * impressions) / totalImpr : prev.position;
      prev.clicks += clicks;
      prev.impressions = totalImpr;
    }
  }
  return Array.from(byPath.values());
}

function groupStats(rows: Row[]): Record<PageGroup, GroupStats> {
  const out = Object.fromEntries(PAGE_GROUPS.map((g) => [g, { pages: 0, clicks: 0, impressions: 0, ctr: 0, position: 0 }])) as Record<PageGroup, GroupStats>;
  for (const r of rows) {
    const g = out[pageGroup(r.path)];
    g.pages++;
    g.clicks += r.clicks;
    g.impressions += r.impressions;
    g.position += r.position * r.impressions; // weighted; divided below
  }
  for (const g of Object.values(out)) {
    g.ctr = g.impressions ? g.clicks / g.impressions : 0;
    g.position = g.impressions ? g.position / g.impressions : 0;
  }
  return out;
}

/* ──────────────────────────────────────────── output ────────────────────────────────────────── */

const pct = (x: number) => `${(x * 100).toFixed(2)}%`;
const pos = (x: number) => (x ? x.toFixed(1) : "—");
const delta = (a: number, b: number) => (a === 0 ? (b === 0 ? "0" : "new") : `${b >= a ? "+" : ""}${(((b - a) / a) * 100).toFixed(0)}%`);
const pad = (s: string | number, n: number) => String(s).padEnd(n);
const lpad = (s: string | number, n: number) => String(s).padStart(n);

const [before, after] = files.map(readExport);
const sBefore = groupStats(before);
const sAfter = after ? groupStats(after) : undefined;

console.log(`\nSearch Console page groups — ${files[0]}${files[1] ? `  vs  ${files[1]}` : ""}\n`);
if (!sAfter) {
  console.log(`${pad("Group", 30)}${lpad("Pages", 7)}${lpad("Clicks", 10)}${lpad("Impr.", 12)}${lpad("CTR", 9)}${lpad("Pos.", 7)}`);
  for (const g of PAGE_GROUPS) {
    const s = sBefore[g];
    if (!s.pages) continue;
    console.log(`${pad(g, 30)}${lpad(s.pages, 7)}${lpad(s.clicks, 10)}${lpad(s.impressions, 12)}${lpad(pct(s.ctr), 9)}${lpad(pos(s.position), 7)}`);
  }
} else {
  console.log(`${pad("Group", 30)}${lpad("Clicks", 16)}${lpad("Δ", 7)}${lpad("Impressions", 20)}${lpad("Δ", 7)}${lpad("CTR", 18)}${lpad("Position", 14)}`);
  for (const g of PAGE_GROUPS) {
    const a = sBefore[g], b = sAfter[g];
    if (!a.pages && !b.pages) continue;
    console.log(
      `${pad(g, 30)}${lpad(`${a.clicks} → ${b.clicks}`, 16)}${lpad(delta(a.clicks, b.clicks), 7)}` +
      `${lpad(`${a.impressions} → ${b.impressions}`, 20)}${lpad(delta(a.impressions, b.impressions), 7)}` +
      `${lpad(`${pct(a.ctr)} → ${pct(b.ctr)}`, 18)}${lpad(`${pos(a.position)} → ${pos(b.position)}`, 14)}`,
    );
  }
  const prev = new Map(before.map((r) => [r.path, r]));
  const losers = after
    .map((r) => ({ path: r.path, group: pageGroup(r.path), clicks: r.clicks - (prev.get(r.path)?.clicks ?? 0), impressions: r.impressions - (prev.get(r.path)?.impressions ?? 0) }))
    .concat(before.filter((r) => !after.some((x) => x.path === r.path)).map((r) => ({ path: r.path, group: pageGroup(r.path), clicks: -r.clicks, impressions: -r.impressions })))
    .filter((x) => x.clicks < 0 || x.impressions < 0)
    .sort((x, y) => x.clicks - y.clicks || x.impressions - y.impressions)
    .slice(0, top);
  console.log(`\nPages losing the most visibility (top ${top}, by clicks then impressions):`);
  for (const l of losers) console.log(`  ${pad(l.path, 70)} ${lpad(l.clicks, 6)} clicks ${lpad(l.impressions, 8)} impr.  [${l.group}]`);
}

const busiest = [...(after ?? before)].sort((a, b) => b.impressions - a.impressions).slice(0, top);
console.log(`\nTop ${top} pages by impressions${after ? " (later period)" : ""}:`);
for (const r of busiest) console.log(`  ${pad(r.path, 70)} ${lpad(r.impressions, 8)} impr. ${lpad(r.clicks, 6)} clicks  pos ${pos(r.position)}  [${pageGroup(r.path)}]`);
console.log("\nCompare equal-length windows on the same weekdays; on small groups treat swings under ±20 % as noise.");

if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ files, before: sBefore, after: sAfter }, null, 2));
