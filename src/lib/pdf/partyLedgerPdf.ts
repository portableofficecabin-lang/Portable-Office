/**
 * PARTY LEDGER STATEMENT — the downloadable customer statement.
 *
 * Built as VECTOR jsPDF + autoTable, deliberately NOT a DOM capture. A statement is text and rules;
 * drawing it directly keeps the type razor-sharp at any zoom, keeps the file tiny, and sidesteps the
 * whole html2canvas colour/theme problem (see src/lib/pdf/sanitizeColors.ts) — there is no palette to
 * resolve because nothing is rasterised.
 *
 * ── THE ONE RULE THIS FILE EXISTS TO ENFORCE ────────────────────────────────────────────────────
 * The statement has TWO parts and they must never be added together:
 *
 *   PART A — ACCOUNTS LEDGER.  The books. Debits, credits, running balance, closing receivable.
 *   PART B — MEMORANDUM.       Completed goods held at the customer's request, NOT yet invoiced.
 *
 * Part B is NOT a receivable. No tax invoice has been raised, the goods have not been removed, so
 * control has not transferred: in the books they are still Finished Goods (inventory), no debtor
 * exists, and no GST liability has been triggered. Printing that value inside the balance would
 * overstate receivables and misstate GST. It is therefore rendered in its own block, under its own
 * total, with an explicit "not included in the balance above" banner.
 *
 * ── WHY "Rs." AND NOT "₹" ───────────────────────────────────────────────────────────────────────
 * jsPDF's built-in Helvetica is a WinAnsi/cp1252 font and the rupee sign (U+20B9) is not in that
 * character set — it drops out or prints as a stray glyph. Rendering it properly means embedding a
 * Unicode font (hundreds of KB) into every statement. A statement that says "Rs." and is readable
 * beats one that says nothing where the amount should be.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { COMPANY } from "@/lib/company";
import { addLegalFooter } from "@/lib/pdfFooter";

/* ----------------------------------------------------------------- types */

export interface LedgerStatementRow {
  date: string;
  ref: string;
  type: string;
  project: string;
  debit: number;
  credit: number;
  status: string;
}

export interface HoldItemRow {
  item_description: string;
  rate: number;
  qty: number;
  amount: number;
  held_on: string;
  status: string;
  gst_treatment: "inclusive" | "exclusive" | "unknown" | string;
  gst_rate_pct: number;
  hold_reason?: string | null;
}

export interface PartyLedgerPdfInput {
  party: {
    name: string;
    company?: string | null;
    gstin?: string | null;
    phone?: string | null;
    billing_address?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
  };
  /** Formal ledger rows (any order — sorted here). */
  rows: LedgerStatementRow[];
  /** Opening balance carried into the period. */
  opening: number;
  /** Memorandum items. Only non-invoiced ones should be passed in. */
  holdItems: HoldItemRow[];
  projectLabel?: string;
}

/* --------------------------------------------------------------- helpers */

/** "1567840" → "Rs. 15,67,840.00" (Indian grouping). See the header note on the rupee glyph. */
const money = (n: number): string =>
  `Rs. ${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const dmy = (d: string): string => {
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return String(d ?? "—");
  return `${String(t.getDate()).padStart(2, "0")}-${String(t.getMonth() + 1).padStart(2, "0")}-${t.getFullYear()}`;
};

const finalY = (doc: jsPDF): number => (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 0;

/** What each hold line would actually invoice for, once GST is applied to exclusive-rated lines. */
export function projectedInvoiceValue(items: HoldItemRow[]): number {
  return items.reduce((sum, it) => {
    const amt = Number(it.amount || 0);
    // 'inclusive' already carries the tax. 'unknown' is left at face value rather than inventing tax.
    const gross = it.gst_treatment === "exclusive" ? amt * (1 + Number(it.gst_rate_pct || 0) / 100) : amt;
    return sum + gross;
  }, 0);
}

/* ---------------------------------------------------------------- export */

export function downloadPartyLedgerPdf(input: PartyLedgerPdfInput): { pages: number; bytes: number } {
  const { party, opening, holdItems, projectLabel } = input;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const M = 12;
  const pageW = doc.internal.pageSize.getWidth();

  /* ---- letterhead -------------------------------------------------- */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(COMPANY.legalName.toUpperCase(), M, M + 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(90, 100, 115);
  const addr = doc.splitTextToSize(
    "Door No. 2/149-6, Survey No. 222/1C, Addakurukki Village, Kamandoddi Post, Shoolagiri, Krishnagiri, Tamil Nadu 635117",
    108,
  );
  doc.text(addr, M, M + 9);
  // COMPANY.phones is {e164, display}[] — not strings. Interpolating the object prints
  // "[object Object]" on a customer-facing statement.
  const phoneLine = COMPANY.phones.map((p) => p.display).join(" / ");
  doc.text(`Phone: ${phoneLine}   GSTIN: ${COMPANY.gstin}`, M, M + 9 + addr.length * 3.4);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("PARTY LEDGER STATEMENT", pageW - M, M + 4, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${dmy(new Date().toISOString())}`, pageW - M, M + 9, { align: "right" });
  if (projectLabel && projectLabel !== "all") {
    doc.text(`Project: ${projectLabel}`, pageW - M, M + 13, { align: "right" });
  }

  let y = M + 24;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);
  doc.line(M, y, pageW - M, y);
  y += 6;

  /* ---- bill-to ------------------------------------------------------ */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("TO", M, y);
  y += 4.5;

  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(party.company || party.name, M, y);
  y += 4.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const partyAddr = [party.billing_address, [party.city, party.state, party.pincode].filter(Boolean).join(", ")]
    .filter(Boolean)
    .join(", ");
  if (partyAddr) {
    const lines = doc.splitTextToSize(partyAddr, 120);
    doc.text(lines, M, y);
    y += lines.length * 3.8;
  }
  const idLine = [party.phone ? `Phone: ${party.phone}` : "", party.gstin ? `GSTIN: ${party.gstin}` : ""]
    .filter(Boolean)
    .join("    ");
  if (idLine) {
    doc.text(idLine, M, y);
    y += 5;
  }

  /* ---- PART A: the books -------------------------------------------- */
  const rows = [...input.rows].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let running = opening;
  const body = rows.map((r) => {
    running += Number(r.debit || 0) - Number(r.credit || 0);
    return [
      dmy(r.date),
      r.type,
      r.ref || "—",
      r.project || "—",
      r.debit ? money(r.debit) : "—",
      r.credit ? money(r.credit) : "—",
      money(running),
      r.status || "",
    ];
  });

  const totalDebit = rows.reduce((s, r) => s + Number(r.debit || 0), 0);
  const totalCredit = rows.reduce((s, r) => s + Number(r.credit || 0), 0);
  const closing = opening + totalDebit - totalCredit;

  y += 3;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text("PART A  —  ACCOUNTS LEDGER  (books of account)", M, y);
  y += 2;

  autoTable(doc, {
    startY: y + 2,
    head: [["Date", "Particulars", "Ref", "Project", "Debit", "Credit", "Balance", "Status"]],
    body: [
      ["—", "Opening Balance", "—", "—", "—", "—", money(opening), ""],
      ...body,
    ],
    foot: [["", "TOTAL", "", "", money(totalDebit), money(totalCredit), money(closing), ""]],
    theme: "grid",
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 7.5, fontStyle: "bold" },
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontSize: 7.5, fontStyle: "bold" },
    styles: { fontSize: 7, cellPadding: 1.6, lineColor: [203, 213, 225], lineWidth: 0.1 },
    columnStyles: {
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right", fontStyle: "bold" },
    },
    margin: { left: M, right: M, bottom: 18 },
  });

  y = finalY(doc) + 6;

  // Closing receivable — the ONLY number that is a receivable.
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.3);
  doc.roundedRect(pageW - M - 78, y, 78, 10, 1, 1, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("CLOSING RECEIVABLE", pageW - M - 75, y + 6.5);
  doc.text(money(closing), pageW - M - 3, y + 6.5, { align: "right" });
  y += 16;

  /* ---- PART B: memorandum ------------------------------------------- */
  const holdTotal = holdItems.reduce((s, h) => s + Number(h.amount || 0), 0);

  if (holdItems.length) {
    // Keep the whole memorandum block together — never split its banner from its table.
    if (y > 200) {
      doc.addPage();
      y = M + 6;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text("PART B  —  COMPLETED ITEMS, CUSTOMER HOLD  (memorandum)", M, y);
    y += 4;

    // The banner is the point of this whole file. Make it impossible to miss.
    doc.setFillColor(254, 249, 231);
    doc.setDrawColor(217, 119, 6);
    doc.setLineWidth(0.4);
    const bannerLines = doc.splitTextToSize(
      "MEMORANDUM ONLY — NOT A RECEIVABLE. These goods are completed and ready for dispatch; dispatch is postponed at the customer's request. No tax invoice has been raised and no payment is due. This value is NOT included in the Closing Receivable above and must not be shown as an outstanding/debit balance until invoiced.",
      pageW - M * 2 - 6,
    );
    const bannerH = bannerLines.length * 3.5 + 5;
    doc.roundedRect(M, y, pageW - M * 2, bannerH, 1, 1, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(146, 64, 14);
    doc.text(bannerLines, M + 3, y + 4);
    y += bannerH + 4;

    autoTable(doc, {
      startY: y,
      head: [["#", "Particulars", "Rate", "Qty", "Amount", "GST basis", "Held On", "Status"]],
      body: holdItems.map((h, i) => [
        String(i + 1),
        h.item_description,
        money(h.rate),
        String(h.qty),
        money(h.amount),
        h.gst_treatment === "inclusive"
          ? `Incl. ${h.gst_rate_pct}%`
          : h.gst_treatment === "exclusive"
            ? `Excl. ${h.gst_rate_pct}%`
            : "NOT SET",
        dmy(h.held_on),
        h.status === "invoice_pending" ? "Invoice Pending" : h.status,
      ]),
      foot: [["", "TOTAL VALUE ON CUSTOMER HOLD", "", "", money(holdTotal), "", "", ""]],
      theme: "grid",
      headStyles: { fillColor: [180, 83, 9], textColor: 255, fontSize: 7.5, fontStyle: "bold" },
      footStyles: { fillColor: [254, 243, 199], textColor: [120, 53, 15], fontSize: 8, fontStyle: "bold" },
      styles: { fontSize: 7.5, cellPadding: 1.8, lineColor: [253, 230, 138], lineWidth: 0.1 },
      columnStyles: {
        0: { cellWidth: 8 },
        2: { halign: "right" },
        3: { halign: "center" },
        4: { halign: "right", fontStyle: "bold" },
      },
      margin: { left: M, right: M, bottom: 18 },
    });

    y = finalY(doc) + 6;

    // If any line is priced GST-exclusive, the eventual invoice is BIGGER than the hold total.
    // Say so, with the number — a silent difference here becomes a wrong invoice later.
    const projected = projectedInvoiceValue(holdItems);
    const unset = holdItems.some((h) => h.gst_treatment === "unknown");
    if (Math.abs(projected - holdTotal) > 0.5 || unset) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(120, 53, 15);
      const note = unset
        ? `Note: one or more lines have no GST basis recorded ("NOT SET"). Confirm whether the rate is inclusive or exclusive of GST before invoicing — the invoice value depends on it.`
        : `Note: lines priced exclusive of GST will invoice higher. Projected invoice value incl. GST: ${money(projected)} (difference ${money(projected - holdTotal)}).`;
      const nl = doc.splitTextToSize(note, pageW - M * 2);
      doc.text(nl, M, y);
      y += nl.length * 3.6 + 3;
    }

    /* ---- position summary ------------------------------------------- */
    if (y > 250) {
      doc.addPage();
      y = M + 6;
    }
    autoTable(doc, {
      startY: y,
      head: [["Position summary", "Amount"]],
      body: [
        ["Customer outstanding — formal books (Part A)", money(closing)],
        ["Completed goods on hold — memorandum (Part B)", money(holdTotal)],
        ["Combined exposure (information only — NOT a receivable)", money(closing + holdTotal)],
      ],
      theme: "grid",
      headStyles: { fillColor: [51, 65, 85], textColor: 255, fontSize: 7.5, fontStyle: "bold" },
      styles: { fontSize: 7.5, cellPadding: 1.8, lineColor: [203, 213, 225], lineWidth: 0.1 },
      columnStyles: { 1: { halign: "right", fontStyle: "bold", cellWidth: 45 } },
      margin: { left: M, right: M, bottom: 18 },
    });
  }

  addLegalFooter(doc);

  const safe = (party.company || party.name).replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);
  const name = `Ledger_${safe || "party"}.pdf`;
  const blob = doc.output("blob") as Blob;
  doc.save(name);

  return { pages: doc.getNumberOfPages(), bytes: blob.size };
}
