// browser-only
/**
 * MATERIAL BOQ — the nine downloadable reports (spec §9). BROWSER ONLY.
 *
 * This is the ONE module in src/lib/boq/ that is allowed to touch xlsx + jsPDF. The engine stays
 * pure so it can be unit-tested and server-rendered; the moment a report imports xlsx (≈400 KB) and
 * jspdf (≈350 KB), it must never be reachable from the public homepage bundle — so the UI
 * dynamic-import()s this file behind the download buttons and the cost stays on the click, not on
 * the first paint.
 *
 * Three decisions worth the words:
 *
 *  1. THE RUPEE SIGN IS BANNED FROM EVERY PDF. jsPDF's built-in (Helvetica) fonts are Latin-1 only,
 *     so U+20B9 (₹) does not merely render blank — it CORRUPTS the cell it sits in. Every amount in
 *     a PDF goes through rsPdf() → "Rs. 1,23,456". formatINR() (which emits ₹) is used for Excel
 *     ONLY. This is the same fix documented in CabinCalculator's PDF export; do not "improve" it.
 *
 *  2. ONE ROW BUILDER PER REPORT, TWO MEDIA. Each report is built as a {head, body} SheetSpec and
 *     is fed to BOTH the Excel writer and autoTable. A `Fmt` decides only how money and numbers
 *     render: Excel gets raw NUMBERS (so the buyer can sum a column), the PDF gets grouped strings.
 *     Nothing is formatted twice, so the Excel and the PDF can never disagree.
 *
 *  3. SUBTOTALS ARE READ, NOT RE-DERIVED. Section subtotals come from `result.sections` and the
 *     money from `result.totals` — both computed by the engine, which alone knows the enabled/
 *     disabled and override rules. A report that re-sums the lines is a second, divergent engine.
 */

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { addLegalFooter } from "@/lib/pdfFooter";
import { formatINR } from "@/lib/exportUtils";
import { COMPANY, formatAddress } from "@/lib/company";
import type {
  BoqLine,
  BoqResult,
  BoqSection,
  RateUnit,
  SectionSummary,
  WeightBasis,
} from "@/lib/boq/types";
import { BOQ_SECTIONS, round } from "@/lib/boq/types";

/* ==========================================================================
 * 1. FORMATTING — the ₹ / Rs. firewall
 * ========================================================================== */

type Cell = string | number;
type Doc = jsPDF & { lastAutoTable?: { finalY: number } };

const MARGIN = 40;
const AMBER: [number, number, number] = [217, 119, 6];
const RED: [number, number, number] = [185, 28, 28];
const GREY: [number, number, number] = [245, 245, 245];
const MUTED: [number, number, number] = [130, 130, 130];

/** PDF money. NEVER formatINR() here — the ₹ glyph corrupts a Latin-1 jsPDF cell. */
const rsPdf = (n: number) =>
  "Rs. " + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(Number(n) || 0));

const nf = (n: number, d = 2) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: d }).format(Number(n) || 0);

/** How a medium renders money and numbers. Excel: real numbers. PDF: grouped, Rs.-prefixed text. */
interface Fmt {
  /** An amount cell. */
  money: (n: number) => Cell;
  /** Money composed INTO a string (a rate: "₹68 /kg"). */
  moneyText: (n: number) => string;
  /** A quantity / weight cell. */
  num: (n: number, d?: number) => Cell;
  /** Column heading for a money column. */
  moneyHead: (label: string) => string;
}

const XL: Fmt = {
  money: (n) => round(Number(n) || 0, 2),
  moneyText: (n) => formatINR(n),
  num: (n, d = 2) => round(Number(n) || 0, d),
  moneyHead: (label) => `${label} (₹)`,
};

const PDF: Fmt = {
  money: (n) => rsPdf(n),
  moneyText: (n) => rsPdf(n),
  num: (n, d = 2) => nf(n, d),
  moneyHead: (label) => label,
};

/* ==========================================================================
 * 2. LABELS
 * ========================================================================== */

const SECTION_META = Object.fromEntries(BOQ_SECTIONS.map((s) => [s.id, s])) as Record<
  BoqSection,
  (typeof BOQ_SECTIONS)[number]
>;

/** "sqm" not "m²" — the superscript survives Latin-1, but the canonical unit names in types.ts don't use it. */
const BASIS_LABEL: Record<WeightBasis, string> = {
  kg_per_m: "kg/m",
  kg_per_sqm: "kg/sqm",
  kg_per_nos: "kg/nos",
  none: "—",
};

const RATE_LABEL: Record<RateUnit, string> = {
  per_kg: "/kg",
  per_m: "/m",
  per_sqm: "/sqm",
  per_nos: "/nos",
  per_sheet: "/sheet",
  per_stock_length: "/bar",
  per_ltr: "/ltr",
  per_lot: "/lot",
};

const QTY_SOURCE_LABEL: Record<BoqLine["qtySource"], string> = {
  auto: "Auto",
  manual: "Manual",
  locked: "Locked",
  added: "Added",
};

/** A null unit weight is the Material Master screaming, not a zero. Print it as such. */
const unitWeightText = (l: BoqLine): string =>
  l.unitWeight == null ? "—" : `${round(l.unitWeight, 3)} ${BASIS_LABEL[l.weightBasis]}`;

const rateText = (l: BoqLine, f: Fmt): string =>
  l.rate == null ? "—" : `${f.moneyText(l.rate)} ${RATE_LABEL[l.rateUnit]}`;

const slug = (t: string): string =>
  (t || "boq")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "boq";

const stamp = (): string => new Date().toLocaleString("en-IN");

/** GST % back out of the engine's amounts — BoqTotals carries the money, not the rate. */
const gstPct = (r: BoqResult): number =>
  r.totals.subtotal > 0 ? round((r.totals.gstAmount / r.totals.subtotal) * 100, 2) : 0;

/* ==========================================================================
 * 3. SECTION GROUPING — the elevation-wise breakup (spec §5)
 * ========================================================================== */

interface Group {
  id: BoqSection;
  label: string;
  drawing: string;
  lines: BoqLine[];
  totalKg: number;
  amount: number;
}

/**
 * Lines grouped by BOQ section, in the canonical BOQ_SECTIONS order, empty sections dropped.
 * Subtotals are LIFTED from the engine's SectionSummary — it, not this file, owns the rules about
 * which lines count. The line-sum fallback only fires for a section the engine did not summarise.
 */
function grouped(r: BoqResult): Group[] {
  const sums: Partial<Record<BoqSection, SectionSummary>> = {};
  for (const s of r.sections) sums[s.section] = s;

  return BOQ_SECTIONS.map((s) => {
    const lines = r.lines.filter((l) => l.section === s.id);
    const sum = sums[s.id];
    const on = lines.filter((l) => l.enabled);
    return {
      id: s.id,
      label: s.label,
      drawing: s.drawing,
      lines,
      totalKg: sum ? sum.totalKg : on.reduce((a, l) => a + l.totalWeightKg, 0),
      amount: sum ? sum.materialAmount : on.reduce((a, l) => a + l.amount, 0),
    };
  }).filter((g) => g.lines.length > 0);
}

/* ==========================================================================
 * 4. REPORT BUILDERS — one {head, body} per report, shared by Excel + PDF
 * ========================================================================== */

interface SheetSpec {
  name: string;
  head: string[];
  body: Cell[][];
}

/** Report 1 — the full Material BOQ (spec §9 column list, verbatim). */
function boqSpec(r: BoqResult, f: Fmt): SheetSpec {
  return {
    name: "Material BOQ",
    head: [
      "#",
      "Section",
      "Material Description",
      "Size & Specification",
      "Calculation Formula",
      "Quantity",
      "Unit",
      "Unit Weight",
      "Total Weight (kg)",
      f.moneyHead("Unit Rate"),
      "Wastage %",
      f.moneyHead("Total Amount"),
      "Related Drawing Section",
      "Auto/Manual",
      "Enabled",
      "Remarks",
    ],
    body: r.lines.map((l, i) => [
      i + 1,
      SECTION_META[l.section].label,
      l.description || l.material,
      l.spec,
      l.formula,
      f.num(l.qty, 3),
      l.uom,
      unitWeightText(l),
      f.num(l.totalWeightKg),
      rateText(l, f),
      f.num(l.wastagePercent, 1),
      f.money(l.amount),
      l.drawingRef || SECTION_META[l.section].drawing,
      QTY_SOURCE_LABEL[l.qtySource],
      l.enabled ? "Yes" : "No",
      l.remarks.join(" · "),
    ]),
  };
}

/** Report 2 — the steel cutting list (spec §3). What the saw operator gets. */
function cuttingSpec(r: BoqResult, f: Fmt): SheetSpec {
  return {
    name: "Cutting List",
    head: [
      "#",
      "Section",
      "Member",
      "Material",
      "Size & Specification",
      "Cut Length (m)",
      "Qty (pcs)",
      "Total Length (m)",
      "Weight (kg)",
      "Drawing",
    ],
    body: r.cuttingList.map((c, i) => [
      i + 1,
      SECTION_META[c.section].label,
      c.member,
      c.material,
      c.spec,
      f.num(c.cutLengthM, 3),
      c.qty,
      f.num(c.totalLengthM, 2),
      f.num(c.weightKg, 2),
      c.drawingRef,
    ]),
  };
}

/** Report 3 — kg by material, then the grand weight block. */
function weightSpec(r: BoqResult, f: Fmt): SheetSpec {
  const body: Cell[][] = r.weightSummary.map((w, i) => [
    i + 1,
    w.material,
    w.spec,
    f.num(w.netKg),
    f.num(Math.max(0, w.totalKg - w.netKg)),
    f.num(w.totalKg),
  ]);

  body.push([]);
  body.push(["", "TOTAL STEEL", "", f.num(r.totals.netSteelKg), "", f.num(r.totals.totalSteelKg)]);
  body.push(["", "TOTAL WEIGHT (all materials)", "", "", "", f.num(r.totals.totalWeightKg)]);
  body.push(["", "TOTAL WEIGHT (tonnes)", "", "", "", f.num(r.totals.totalTonnes, 3)]);

  return {
    name: "Weight Summary",
    head: ["#", "Material", "Size & Specification", "Net Weight (kg)", "Wastage (kg)", "Total Weight (kg)"],
    body,
  };
}

/** Report 4 — elevation-wise breakup: every line under its section, each section subtotalled. */
function elevationSpec(r: BoqResult, f: Fmt): SheetSpec {
  const body: Cell[][] = [];

  for (const g of grouped(r)) {
    for (const l of g.lines) {
      body.push([
        g.label,
        g.drawing,
        l.description || l.material,
        l.spec,
        f.num(l.qty, 3),
        l.uom,
        f.num(l.totalWeightKg),
        f.money(l.amount),
        l.enabled ? "Yes" : "No",
      ]);
    }
    body.push([`Subtotal — ${g.label}`, "", "", "", "", "", f.num(g.totalKg), f.money(g.amount), ""]);
    body.push([]);
  }

  body.push([
    "GRAND TOTAL",
    "",
    "",
    "",
    "",
    "",
    f.num(r.totals.totalWeightKg),
    f.money(r.totals.materialAmount),
    "",
  ]);

  return {
    name: "Elevation Breakup",
    head: [
      "Section",
      "Drawing",
      "Material Description",
      "Size & Specification",
      "Quantity",
      "Unit",
      "Total Weight (kg)",
      f.moneyHead("Amount"),
      "Enabled",
    ],
    body,
  };
}

/** Report 5 — the purchase order: what to BUY, nested into stock bars / whole sheets (spec §3, §4). */
function purchaseSpec(r: BoqResult, f: Fmt): SheetSpec {
  return {
    name: "Purchase Report",
    head: [
      "#",
      "Material",
      "Size & Specification",
      "Category",
      "Net Qty",
      "Unit",
      "Wastage %",
      "Purchase Qty",
      "Stock Units",
      "Stock Unit",
      "Off-cut",
      "Total Weight (kg)",
      f.moneyHead("Rate"),
      "Rate Unit",
      f.moneyHead("Amount"),
      "Supplier",
    ],
    body: r.purchase.map((p, i) => [
      i + 1,
      p.material,
      p.spec,
      p.category,
      f.num(p.netQty, 3),
      p.uom,
      f.num(p.wastagePercent, 1),
      f.num(p.purchaseQty, 3),
      p.stockUnits == null ? "—" : p.stockUnits,
      p.stockUnitLabel ?? "—",
      p.offcut == null ? "—" : f.num(p.offcut, 2),
      f.num(p.totalWeightKg),
      p.rate == null ? "—" : f.money(p.rate),
      RATE_LABEL[p.rateUnit],
      f.money(p.amount),
      p.supplier || "—",
    ]),
  };
}

/** Report 6a — cost by section (the customer's "where did the money go"). */
function costSectionSpec(r: BoqResult, f: Fmt): SheetSpec {
  const body: Cell[][] = grouped(r).map((g) => [
    g.label,
    g.drawing,
    g.lines.filter((l) => l.enabled).length,
    f.num(g.totalKg),
    f.money(g.amount),
  ]);

  body.push(["MATERIAL SUBTOTAL", "", "", f.num(r.totals.totalWeightKg), f.money(r.totals.materialAmount)]);

  return {
    name: "Cost by Section",
    head: ["Section", "Drawing", "Lines", "Total Weight (kg)", f.moneyHead("Material Amount")],
    body,
  };
}

/** Report 6b — material + charges + GST → grand total. */
function costTotalsSpec(r: BoqResult, f: Fmt): SheetSpec {
  const t = r.totals;
  const body: Cell[][] = [["Material subtotal", "—", f.money(t.materialAmount)]];

  for (const c of t.chargeLines) body.push([c.label, c.basis, f.money(c.amount)]);

  body.push(["Charges subtotal", "—", f.money(t.chargesAmount)]);
  body.push(["Subtotal (before GST)", "—", f.money(t.subtotal)]);
  body.push([`GST @ ${gstPct(r)}%`, "—", f.money(t.gstAmount)]);
  body.push(["GRAND TOTAL", "—", f.money(t.grandTotal)]);
  body.push([]);
  body.push(["Total weight", "kg", f.num(t.totalWeightKg)]);
  body.push(["Total weight", "tonnes", f.num(t.totalTonnes, 3)]);
  body.push([`Rate per sqft (${f.num(r.meta.floorAreaSqm)} sqm floor area)`, "per sqft", f.money(t.ratePerSqft)]);

  return { name: "Cost Summary", head: ["Description", "Basis", f.moneyHead("Amount")], body };
}

/** Report 7 — validation (spec §10). Errors first: they block the quotation. */
function issuesSpec(r: BoqResult): SheetSpec {
  const order = (s: string) => (s === "error" ? 0 : 1);
  return {
    name: "Validation",
    head: ["Severity", "Code", "Message", "Section", "Refs", "Hint"],
    body: [...r.issues]
      .sort((a, b) => order(a.severity) - order(b.severity))
      .map((i) => [
        i.severity.toUpperCase(),
        i.code,
        i.message,
        i.section ? SECTION_META[i.section].label : "—",
        i.refs.join(", "),
        i.hint ?? "",
      ]),
  };
}

/** Report 8 — the header every other sheet is derived from. */
function metaSpec(r: BoqResult, f: Fmt): SheetSpec {
  const m = r.meta;
  const t = r.totals;
  const body: Cell[][] = [
    ["Title", m.title],
    ["Source", m.source === "cabin" ? "Cabin calculator" : "Labour colony"],
    ["Generated", stamp()],
    [],
    ["Length (m)", f.num(m.lengthM)],
    ["Width (m)", f.num(m.widthM)],
    ["Height (m)", f.num(m.heightM)],
    ["Floor area (sqm)", f.num(m.floorAreaSqm)],
    ["Floors", m.floors],
    ["Modules", m.modules],
    ["Rooms", m.rooms],
    ["Partitions", m.partitions],
    ["Doors", m.doors],
    ["Windows", m.windows],
    ["Staircases", m.staircases],
    ["Verandas", m.verandas],
    ["Roof type", m.roofType],
    [],
    ["Net steel (kg)", f.num(t.netSteelKg)],
    ["Total steel incl. wastage (kg)", f.num(t.totalSteelKg)],
    ["Total weight (kg)", f.num(t.totalWeightKg)],
    ["Total weight (tonnes)", f.num(t.totalTonnes, 3)],
    ["Material amount", f.money(t.materialAmount)],
    ["Charges", f.money(t.chargesAmount)],
    [`GST @ ${gstPct(r)}%`, f.money(t.gstAmount)],
    ["Grand total", f.money(t.grandTotal)],
    ["Rate per sqft", f.money(t.ratePerSqft)],
    ["Errors", r.issues.filter((i) => i.severity === "error").length],
    ["Warnings", r.issues.filter((i) => i.severity === "warning").length],
  ];

  if (r.notes.length) {
    body.push([]);
    for (const n of r.notes) body.push(["Note", n]);
  }

  return { name: "Summary", head: ["Field", "Value"], body };
}

/* ==========================================================================
 * 5. EXCEL WRITER  (multi-sheet — exportUtils only does one)
 * ========================================================================== */

function toWorksheet(s: SheetSpec): XLSX.WorkSheet {
  const aoa: Cell[][] = [s.head, ...s.body];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = s.head.map((_, i) => ({
    wch: Math.min(48, Math.max(10, ...aoa.map((row) => String(row[i] ?? "").length + 2))),
  }));
  return ws;
}

/** Excel sheet names are hard-capped at 31 chars by the format itself. */
function writeBook(sheets: SheetSpec[], filename: string): void {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) XLSX.utils.book_append_sheet(wb, toWorksheet(s), s.name.slice(0, 31));
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/* ==========================================================================
 * 6. PDF PRIMITIVES — the house style (theme grid, amber head, auto page-break)
 * ========================================================================== */

type TableOpts = Parameters<typeof autoTable>[1];

function table(doc: Doc, y: number, head: string[], body: Cell[][], opts: Partial<TableOpts> = {}): number {
  autoTable(doc, {
    startY: y,
    head: [head],
    body,
    theme: "grid",
    styles: { fontSize: 7.5, cellPadding: 3, overflow: "linebreak" },
    headStyles: { fillColor: AMBER, textColor: 255, fontStyle: "bold" },
    footStyles: { fillColor: GREY, textColor: 20, fontStyle: "bold" },
    margin: { left: MARGIN, right: MARGIN },
    ...opts,
  });
  return (doc.lastAutoTable?.finalY ?? y) + 16;
}

function heading(doc: Doc, y: number, text: string): number {
  if (y > doc.internal.pageSize.getHeight() - 90) {
    doc.addPage();
    y = 48;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(text, MARGIN, y);
  return y + 8;
}

function bullets(doc: Doc, y: number, lines: string[], prefix = "• "): number {
  const W = doc.internal.pageSize.getWidth();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  for (const t of lines) {
    if (y > doc.internal.pageSize.getHeight() - 50) {
      doc.addPage();
      y = 48;
    }
    const wrapped = doc.splitTextToSize(prefix + t, W - MARGIN * 2) as string[];
    doc.text(wrapped, MARGIN, y);
    y += wrapped.length * 9 + 2;
  }
  doc.setTextColor(0);
  return y + 8;
}

/** The amber letterhead band. The ONE place company details are printed — sourced from @/lib/company. */
function letterhead(doc: Doc, title: string, subtitle: string): number {
  const W = doc.internal.pageSize.getWidth();
  const bandH = 78;

  doc.setFillColor(...AMBER);
  doc.rect(0, 0, W, bandH, "F");

  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(COMPANY.legalName.toUpperCase(), MARGIN, 30);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const addr = doc.splitTextToSize(formatAddress(COMPANY.addresses.tamilNaduFactory), W - MARGIN * 2) as string[];
  doc.text(addr, MARGIN, 44);
  doc.text(
    `GST: ${COMPANY.gstin}   |   ${COMPANY.phones.map((p) => p.display).join(" / ")}   |   ${COMPANY.domain}`,
    MARGIN,
    bandH - 10,
  );

  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(title, MARGIN, bandH + 24);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text(subtitle, MARGIN, bandH + 38);
  doc.setTextColor(0);

  return bandH + 56;
}

/* ==========================================================================
 * 7. THE NINE REPORTS
 * ========================================================================== */

export function exportBoqExcel(r: BoqResult, title: string): void {
  writeBook([boqSpec(r, XL)], `boq-${slug(title)}`);
}

export function exportCuttingListExcel(r: BoqResult, title: string): void {
  writeBook([cuttingSpec(r, XL)], `cutting-list-${slug(title)}`);
}

export function exportWeightSummaryExcel(r: BoqResult, title: string): void {
  writeBook([weightSpec(r, XL)], `weight-summary-${slug(title)}`);
}

export function exportElevationBreakupExcel(r: BoqResult, title: string): void {
  writeBook([elevationSpec(r, XL)], `elevation-breakup-${slug(title)}`);
}

export function exportPurchaseReportExcel(r: BoqResult, title: string): void {
  writeBook([purchaseSpec(r, XL)], `purchase-report-${slug(title)}`);
}

export function exportCostSummaryExcel(r: BoqResult, title: string): void {
  const sec = costSectionSpec(r, XL);
  const tot = costTotalsSpec(r, XL);
  // Two tables, one sheet: section costs, a blank row, then charges → GST → grand total.
  writeBook(
    [{ name: "Cost Summary", head: sec.head, body: [...sec.body, [], tot.head, ...tot.body] }],
    `cost-summary-${slug(title)}`,
  );
}

/**
 * THE CUSTOMER-FACING SHEET. Portrait, no cutting list, no purchase rates — a customer must not be
 * handed the yard's nesting or the supplier's name. Money is Rs., never ₹ (see the file header).
 */
export function exportQuotationSheetPdf(
  r: BoqResult,
  title: string,
  client?: { name?: string; site?: string },
): void {
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true }) as Doc;
  const W = doc.internal.pageSize.getWidth();
  const m = r.meta;

  let y = letterhead(
    doc,
    title || "Material Cost Sheet",
    `${nf(m.lengthM)} m × ${nf(m.widthM)} m × ${nf(m.heightM)} m   |   ${nf(m.floorAreaSqm)} sqm floor area   |   ${stamp()}`,
  );

  if (client?.name || client?.site) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    if (client.name) {
      doc.text(`Client: ${client.name}`, MARGIN, y);
      y += 13;
    }
    if (client.site) {
      const site = doc.splitTextToSize(`Site: ${client.site}`, W - MARGIN * 2) as string[];
      doc.text(site, MARGIN, y);
      y += site.length * 11;
    }
    y += 8;
  }

  const sec = costSectionSpec(r, PDF);
  y = heading(doc, y, "1. Cost by section");
  y = table(doc, y, sec.head, sec.body, {
    columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
    styles: { fontSize: 8, cellPadding: 4 },
  });

  const tot = costTotalsSpec(r, PDF);
  y = heading(doc, y, "2. Charges, taxes & grand total");
  y = table(doc, y, tot.head, tot.body, {
    columnStyles: { 2: { halign: "right" } },
    styles: { fontSize: 8, cellPadding: 4 },
  });

  if (y > doc.internal.pageSize.getHeight() - 70) {
    doc.addPage();
    y = 48;
  }
  doc.setFillColor(...AMBER);
  doc.rect(MARGIN, y - 12, W - MARGIN * 2, 26, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("GRAND TOTAL (incl. GST)", MARGIN + 8, y + 5);
  doc.text(rsPdf(r.totals.grandTotal), W - MARGIN - 8, y + 5, { align: "right" });
  doc.setTextColor(0);
  y += 32;

  const wt = weightSpec(r, PDF);
  y = heading(doc, y, "3. Weight summary");
  y = table(doc, y, wt.head, wt.body, {
    columnStyles: { 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" } },
  });

  if (r.notes.length) {
    y = heading(doc, y, "Notes & assumptions");
    y = bullets(doc, y, r.notes);
  }

  addLegalFooter(doc);
  doc.save(`quotation-${slug(title)}.pdf`);
}

/**
 * THE FULL BOQ. Landscape — 13 columns of derivation do not fit on portrait A4. One table per
 * section with a subtotal foot, then the cutting list, the weights, the cost, and the validation
 * issues with the ERRORS IN RED, because an error means a material has no weight or no rate and the
 * grand total on page 1 is therefore understated. That has to be impossible to miss.
 */
export function exportBoqPdf(r: BoqResult, title: string): void {
  const doc = new jsPDF({ unit: "pt", orientation: "landscape", format: "a4", compress: true }) as Doc;
  const m = r.meta;

  let y = letterhead(
    doc,
    `Material BOQ — ${title || m.title}`,
    `${nf(m.lengthM)} m × ${nf(m.widthM)} m × ${nf(m.heightM)} m   |   ${nf(m.floorAreaSqm)} sqm   |   ${m.roofType}   |   ${stamp()}`,
  );

  const head = [
    "#",
    "Material Description",
    "Size & Specification",
    "Calculation Formula",
    "Qty",
    "Unit",
    "Unit Weight",
    "Weight (kg)",
    "Rate",
    "Wastage %",
    "Amount",
    "Drawing",
    "Src",
  ];
  const numeric: TableOpts["columnStyles"] = {
    0: { cellWidth: 20 },
    1: { cellWidth: 96 },
    2: { cellWidth: 84 },
    3: { cellWidth: 132 },
    4: { halign: "right" },
    7: { halign: "right" },
    9: { halign: "right" },
    10: { halign: "right" },
    11: { cellWidth: 68 },
    12: { cellWidth: 30 },
  };

  let n = 0;
  for (const g of grouped(r)) {
    y = heading(doc, y, `${g.label} — ${g.drawing}`);
    y = table(
      doc,
      y,
      head,
      g.lines.map((l) => [
        ++n,
        l.description || l.material,
        l.spec,
        l.formula,
        PDF.num(l.qty, 3),
        l.uom,
        unitWeightText(l),
        PDF.num(l.totalWeightKg),
        rateText(l, PDF),
        PDF.num(l.wastagePercent, 1),
        PDF.money(l.amount),
        l.drawingRef || g.drawing,
        l.enabled ? QTY_SOURCE_LABEL[l.qtySource] : "OFF",
      ]),
      {
        columnStyles: numeric,
        foot: [["", `Subtotal — ${g.label}`, "", "", "", "", "", PDF.num(g.totalKg), "", "", PDF.money(g.amount), "", ""]],
        // A disabled line still prints (the admin must see what was switched off) — greyed, not silent.
        didParseCell: (data) => {
          if (data.section === "body" && (data.row.raw as Cell[])[12] === "OFF") {
            data.cell.styles.textColor = MUTED;
            data.cell.styles.fontStyle = "italic";
          }
        },
      },
    );
  }

  const cut = cuttingSpec(r, PDF);
  y = heading(doc, y, "Steel cutting list");
  y = table(doc, y, cut.head, cut.body, {
    columnStyles: { 5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" }, 8: { halign: "right" } },
  });

  const wt = weightSpec(r, PDF);
  y = heading(doc, y, "Weight summary");
  y = table(doc, y, wt.head, wt.body, {
    columnStyles: { 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" } },
  });

  const sec = costSectionSpec(r, PDF);
  y = heading(doc, y, "Cost summary — by section");
  y = table(doc, y, sec.head, sec.body, { columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } } });

  const tot = costTotalsSpec(r, PDF);
  y = heading(doc, y, "Cost summary — charges, GST & grand total");
  y = table(doc, y, tot.head, tot.body, { columnStyles: { 2: { halign: "right" } } });

  if (r.issues.length) {
    const iss = issuesSpec(r);
    y = heading(doc, y, "Validation");
    y = table(doc, y, iss.head, iss.body, {
      didParseCell: (data) => {
        if (data.section === "body" && (data.row.raw as Cell[])[0] === "ERROR") {
          data.cell.styles.textColor = RED;
          data.cell.styles.fontStyle = "bold";
        }
      },
    });
  }

  if (r.notes.length) {
    y = heading(doc, y, "Notes & assumptions");
    y = bullets(doc, y, r.notes);
  }

  addLegalFooter(doc);
  doc.save(`boq-${slug(title)}.pdf`);
}

/** Every sheet above in ONE workbook — the estimator's working file. */
export async function exportAllExcel(r: BoqResult, title: string): Promise<void> {
  const sec = costSectionSpec(r, XL);
  const tot = costTotalsSpec(r, XL);

  writeBook(
    [
      metaSpec(r, XL),
      boqSpec(r, XL),
      elevationSpec(r, XL),
      cuttingSpec(r, XL),
      weightSpec(r, XL),
      purchaseSpec(r, XL),
      { name: "Cost Summary", head: sec.head, body: [...sec.body, [], tot.head, ...tot.body] },
      issuesSpec(r),
    ],
    `boq-full-${slug(title)}`,
  );
}
