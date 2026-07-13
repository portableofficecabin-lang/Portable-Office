"use client";

/**
 * WarrantyCertificate — admin tool to issue a branded Warranty Certificate for a
 * customer. Everything is typed manually (customer, product, and the warranty
 * coverage rows), and a live certificate preview renders on the right.
 *
 * "Download PDF" builds the certificate as a TRUE VECTOR PDF (jsPDF + autoTable) rather than
 * rasterising the preview. That keeps the text selectable and razor-sharp at any zoom, keeps the
 * file to a few tens of KB instead of several MB, and lets autoTable paginate properly (headers
 * repeat, rows are never split). Sheets that are genuinely drawings — where vector reconstruction
 * is impractical — go through the shared raster exporter in lib/pdf/sheetPdf.ts instead.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
// (No html2canvas here: this certificate is generated as VECTOR jsPDF + autoTable, which is both
// sharper and far smaller than a DOM raster. The old raster imports were dead code.)
import { ShieldCheck, Download, Printer, Plus, Trash2, RotateCcw, Award, Save, FolderOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { resolveImageUrl } from "@/utils/resolveImageUrl";
import { imageToPngDataUrl } from "@/lib/pdf/imageToPng";
import { addLegalFooter, LEGAL_FOOTER_TEXT } from "@/lib/pdfFooter";
import logo from "@/assets/logo.webp";

// Canonical company details (kept in sync with the site's structured data / header).
const COMPANY = {
  name: "Portable Office Cabin",
  address: "Survey No. 222, Door No. 2/149-6, Road 1C, Kamandoddi, Hosur, Tamil Nadu 635117",
  phone: "+91 97318 97976",
  email: "sales@portableofficecabin.com",
  website: "www.portableofficecabin.com",
  gst: "33FVKPK6238Q1ZT",
};

// ISO certification — kept in sync with src/components/IsoCertificationBadge.tsx
// (the single source of the certificate wording across the site).
const ISO_CERT = {
  standard: "ISO 9001:2015",
  scope: "Quality Management System",
  number: "QT-99968/0726",
};

const NAVY = "#0f1b2d";
const AMBER = "#f59e0b";

// html2canvas 1.4.1's colour parser can't read modern CSS colour functions
// (oklch/oklab/lab/lch/color()). If any computed style in the cloned subtree
// uses one, the whole export throws "Attempting to parse an unsupported color
// function 'oklch'". These helpers convert such values to plain rgb using the
// browser's native canvas colour engine, applied in html2canvas's onclone hook.
const UNSUPPORTED_COLOR = /(oklch|oklab|\blab\(|\blch\(|color\()/i;
const COLOR_PROPS = [
  "color", "background-color", "border-top-color", "border-right-color",
  "border-bottom-color", "border-left-color", "outline-color",
  "text-decoration-color", "column-rule-color", "fill", "stroke",
];
let _colorCanvas: HTMLCanvasElement | null = null;
function toRenderableColor(value: string): string {
  if (typeof document === "undefined") return value;
  if (!_colorCanvas) _colorCanvas = document.createElement("canvas");
  const ctx = _colorCanvas.getContext("2d");
  if (!ctx) return value;
  try {
    ctx.fillStyle = "#000000";
    ctx.fillStyle = value; // native canvas understands oklch/lab/etc.
    return ctx.fillStyle as string; // normalised to #rrggbb / rgba()
  } catch {
    return "#000000";
  }
}
function sanitizeUnsupportedColors(doc: Document) {
  const win = doc.defaultView || window;
  const root = doc.getElementById("warranty-print") || doc.body;
  if (!root) return;
  const targets: HTMLElement[] = [root as HTMLElement, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
  for (const el of targets) {
    const cs = win.getComputedStyle(el);
    for (const prop of COLOR_PROPS) {
      const val = cs.getPropertyValue(prop);
      if (val && UNSUPPORTED_COLOR.test(val)) el.style.setProperty(prop, toRenderableColor(val));
    }
    const bgImg = cs.getPropertyValue("background-image");
    if (bgImg && UNSUPPORTED_COLOR.test(bgImg)) el.style.setProperty("background-image", "none");
    const boxShadow = cs.getPropertyValue("box-shadow");
    if (boxShadow && UNSUPPORTED_COLOR.test(boxShadow)) el.style.setProperty("box-shadow", "none");
  }
}

type WItem = { component: string; coverage: string; remarks: string };
// One warrantied product with its own validity — a certificate can list several.
type WProduct = { product: string; serialNo: string; warrantyPeriod: string; validFrom: string; validUntil: string };
const blankProduct = (): WProduct => ({ product: "", serialNo: "", warrantyPeriod: "", validFrom: "", validUntil: "" });
// One shipment / delivery for the whole certificate.
type WShipping = {
  deliveryAddress: string; dispatchDate: string; deliveryDate: string;
  transporter: string; vehicleNo: string; lrNo: string; units: string; contact: string;
};
const blankShipping: WShipping = {
  deliveryAddress: "", dispatchDate: "", deliveryDate: "",
  transporter: "", vehicleNo: "", lrNo: "", units: "", contact: "",
};

// A saved certificate row (public.warranty_certificates) as returned by Supabase.
type SavedRow = {
  id: string;
  cert_no: string | null;
  issue_date: string | null;
  customer_name: string | null;
  customer_company: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  products: WProduct[] | null;
  shipping: Partial<WShipping> | null;
  coverage: WItem[] | null;
  terms: string | null;
  signatory: string | null;
  updated_at: string;
};
const SAVED_COLS =
  "id, cert_no, issue_date, customer_name, customer_company, customer_phone, customer_address, products, shipping, coverage, terms, signatory, updated_at";

// Minimal typed handle for public.warranty_certificates — the table isn't in the generated
// Supabase types yet, so we cast through `unknown` (no `any`) while keeping the builder chains
// we use typed. Every builder method returns the builder, which is awaitable to { data, error }.
interface WcBuilder<T> extends PromiseLike<{ data: T; error: { message?: string } | null }> {
  select(cols?: string): WcBuilder<T>;
  order(col: string, opts: { ascending: boolean }): WcBuilder<T>;
  limit(n: number): WcBuilder<T>;
  insert(payload: unknown): WcBuilder<T>;
  update(payload: unknown): WcBuilder<T>;
  delete(): WcBuilder<T>;
  eq(col: string, val: string): WcBuilder<T>;
  single(): WcBuilder<T>;
}
const wcTable = <T,>(): WcBuilder<T> =>
  (supabase as unknown as { from(t: string): WcBuilder<T> }).from("warranty_certificates");

// Common components — a click drops in a row (with the component pre-filled); the
// admin still types the actual warranty duration/terms manually.
const QUICK_COMPONENTS = [
  "Structure / MS Frame", "PUF Insulated Panel", "Roofing Sheet", "Wall Sheet",
  "Flooring", "Electrical Fittings", "Doors & Windows", "Plumbing / Sanitary", "Paint / Finish",
];

const todayISO = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const prettyDate = (iso: string) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d} ${months[(parseInt(m, 10) || 1) - 1]} ${y}`;
};

const blankCert = {
  certNo: "",
  issueDate: "",
  customerName: "",
  customerCompany: "",
  customerAddress: "",
  customerPhone: "",
  terms:
    "1. Warranty covers manufacturing defects only, under normal use and proper maintenance.\n" +
    "2. Damage from misuse, unauthorised modification, relocation without company supervision, fire, flood or natural calamity is not covered.\n" +
    "3. Warranty claims must quote this certificate number; service is provided ex-works / at our discretion on site.\n" +
    "4. Consumables and normal wear-and-tear are excluded.",
  signatory: "Authorised Signatory",
};

// Module-level so it keeps a stable identity across renders (an input defined inline in the
// component body would remount every keystroke and lose focus).
function LField({ label, value, onChange, placeholder, type }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input type={type || "text"} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export default function WarrantyCertificate() {
  const [cert, setCert] = useState(blankCert);
  const [products, setProducts] = useState<WProduct[]>([blankProduct()]);
  const [shipping, setShipping] = useState<WShipping>(blankShipping);
  const [items, setItems] = useState<WItem[]>([{ component: "", coverage: "", remarks: "" }]);
  const [busy, setBusy] = useState(false);
  // Save / Edit persistence (public.warranty_certificates). savedId set ⇒ we're editing that row.
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<SavedRow[]>([]);
  const [listErr, setListErr] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Pre-render the .webp logo to an inline PNG data URL. html2canvas 1.4.1 is
  // unreliable with webp / crossOrigin <img> (it can taint the canvas so
  // toDataURL throws, breaking the whole PDF). An embedded data URL sidesteps
  // that entirely and keeps the on-screen preview identical.
  const [logoDataUrl, setLogoDataUrl] = useState<string>(resolveImageUrl(logo));
  useEffect(() => {
    let alive = true;
    imageToPngDataUrl(logo, { format: "png" })
      .then((url) => { if (alive && url) setLogoDataUrl(url); })
      .catch(() => { /* keep the resolveImageUrl fallback */ });
    return () => { alive = false; };
  }, []);

  // Populate date-derived defaults on the client only (avoids any SSR/client mismatch).
  useEffect(() => {
    const iso = todayISO();
    setCert((c) => ({
      ...c,
      issueDate: c.issueDate || iso,
      certNo: c.certNo || `POC/WC/${iso.slice(0, 4)}/001`,
    }));
    setProducts((ps) => ps.map((p, i) => (i === 0 && !p.validFrom ? { ...p, validFrom: iso } : p)));
  }, []);

  const set = (k: keyof typeof cert, v: string) => setCert((c) => ({ ...c, [k]: v }));
  const setItem = (i: number, k: keyof WItem, v: string) =>
    setItems((rows) => rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const addItem = (component = "") => setItems((rows) => [...rows, { component, coverage: "", remarks: "" }]);
  const removeItem = (i: number) => setItems((rows) => (rows.length > 1 ? rows.filter((_, idx) => idx !== i) : rows));

  // Products & Validity — multiple products, each with its own serial / warranty / validity.
  const setProduct = (i: number, k: keyof WProduct, v: string) =>
    setProducts((ps) => ps.map((p, idx) => (idx === i ? { ...p, [k]: v } : p)));
  const addProduct = () => setProducts((ps) => [...ps, blankProduct()]);
  const removeProduct = (i: number) => setProducts((ps) => (ps.length > 1 ? ps.filter((_, idx) => idx !== i) : ps));

  // Shipping / delivery (one shipment per certificate).
  const setShip = (k: keyof WShipping, v: string) => setShipping((s) => ({ ...s, [k]: v }));

  // ---- Save / Edit (Supabase: public.warranty_certificates) ----
  const fetchSaved = useCallback(async () => {
    // `warranty_certificates` isn't in the generated Supabase types until they're regenerated,
    // so cast to `any` for this table (same pattern used elsewhere in the admin, e.g. parties).
    const { data, error } = await wcTable<SavedRow[] | null>()
      .select(SAVED_COLS).order("updated_at", { ascending: false }).limit(100);
    if (error) { setListErr(error.message ?? "Failed to load"); setSaved([]); return; }
    setListErr(null);
    setSaved(data ?? []);
  }, []);
  useEffect(() => { fetchSaved(); }, [fetchSaved]);

  const saveCertificate = async () => {
    if (!cert.customerName.trim()) {
      toast({ title: "Customer name required", description: "Enter the customer name before saving.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      cert_no: cert.certNo,
      issue_date: cert.issueDate || null,
      customer_name: cert.customerName,
      customer_company: cert.customerCompany,
      customer_phone: cert.customerPhone,
      customer_address: cert.customerAddress,
      products,
      shipping,
      coverage: items,
      terms: cert.terms,
      signatory: cert.signatory,
    };
    const table = wcTable<{ id: string; cert_no: string | null }>();
    const { data, error } = savedId
      ? await table.update(payload).eq("id", savedId).select().single()
      : await table.insert(payload).select().single();
    setSaving(false);
    if (error || !data) {
      const missing = /warranty_certificates|schema cache|does not exist/i.test(error?.message || "");
      toast({
        title: "Save failed",
        description: missing ? "Run the warranty_certificates migration on your database first, then try again." : (error?.message ?? "Please try again."),
        variant: "destructive",
      });
      return;
    }
    setSavedId(data.id);
    toast({ title: savedId ? "Certificate updated" : "Certificate saved", description: `${data.cert_no || "Certificate"} saved.` });
    fetchSaved();
  };

  const loadCertificate = (row: SavedRow) => {
    setCert({
      certNo: row.cert_no || "",
      issueDate: row.issue_date || "",
      customerName: row.customer_name || "",
      customerCompany: row.customer_company || "",
      customerPhone: row.customer_phone || "",
      customerAddress: row.customer_address || "",
      terms: typeof row.terms === "string" ? row.terms : blankCert.terms,
      signatory: row.signatory || "Authorised Signatory",
    });
    setProducts(Array.isArray(row.products) && row.products.length
      ? row.products.map((p) => ({ ...blankProduct(), ...(p as Partial<WProduct>) }))
      : [blankProduct()]);
    setShipping({ ...blankShipping, ...(row.shipping || {}) });
    setItems(Array.isArray(row.coverage) && row.coverage.length
      ? row.coverage.map((r) => ({ component: "", coverage: "", remarks: "", ...(r as Partial<WItem>) }))
      : [{ component: "", coverage: "", remarks: "" }]);
    setSavedId(row.id);
    toast({ title: "Loaded for editing", description: `Editing ${row.cert_no || "certificate"}.` });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteCertificate = async (id: string) => {
    const { error } = await wcTable<null>().delete().eq("id", id);
    if (error) { toast({ title: "Delete failed", description: error.message ?? "Please try again.", variant: "destructive" }); return; }
    if (id === savedId) setSavedId(null);
    toast({ title: "Certificate deleted" });
    fetchSaved();
  };

  const resetAll = () => {
    const iso = todayISO();
    setCert({ ...blankCert, issueDate: iso, certNo: `POC/WC/${iso.slice(0, 4)}/001` });
    setProducts([{ ...blankProduct(), validFrom: iso }]);
    setShipping(blankShipping);
    setItems([{ component: "", coverage: "", remarks: "" }]);
    setSavedId(null); // start a fresh, unsaved certificate
  };

  const rowsForDoc = items.filter((r) => r.component.trim() || r.coverage.trim());
  const productsForDoc = products.filter((p) => p.product.trim() || p.serialNo.trim() || p.warrantyPeriod.trim());
  const shipHasAny = Object.values(shipping).some((v) => v.trim());
  const shipEntries: [string, string][] = [
    ["Delivery Address", shipping.deliveryAddress || "—"],
    ["No. of Units / Packages", shipping.units || "—"],
    ["Dispatch Date", prettyDate(shipping.dispatchDate)],
    ["Delivery Date", prettyDate(shipping.deliveryDate)],
    ["Transporter / Courier", shipping.transporter || "—"],
    ["Vehicle No.", shipping.vehicleNo || "—"],
    ["LR / Docket No.", shipping.lrNo || "—"],
    ["Delivery Contact", shipping.contact || "—"],
  ];

  // Vector (jsPDF + autoTable) certificate. Unlike a rasterised DOM snapshot, autoTable
  // paginates PROPERLY: it never splits a row, repeats the table header on every page,
  // keeps each section heading with its header row, and flows with no blank gaps. A page
  // border + fixed legal/disclaimer footer are stamped on every page at the end.
  const downloadPDF = async () => {
    if (!cert.customerName.trim()) {
      toast({ title: "Customer name required", description: "Enter the customer name before downloading.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
      const PW = 210, PH = 297;
      const LEFT = 15, RIGHT = 15, contentW = PW - LEFT - RIGHT;
      const navy: [number, number, number] = [15, 27, 45];
      const amber: [number, number, number] = [245, 158, 11];
      const gray: [number, number, number] = [55, 65, 81];
      const CONTENT_BOTTOM = PH - 20;                 // tables/text never cross this line
      const TABLE_MARGIN = { top: 16, bottom: 20, left: LEFT, right: RIGHT };
      const lastY = (): number => (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? TABLE_MARGIN.top;

      const logoData = await imageToPngDataUrl(logo, { format: "png" }).catch(() => null);

      let y = 15;
      // ---------- page-1 letterhead ----------
      if (logoData) { try { pdf.addImage(logoData, "PNG", LEFT, y, 16, 16); } catch { /* skip */ } }
      const tx = logoData ? LEFT + 20 : LEFT;
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(15); pdf.setTextColor(...navy);
      pdf.text(COMPANY.name, tx, y + 5);
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(...gray);
      const addr = pdf.splitTextToSize(COMPANY.address, contentW - (tx - LEFT)) as string[];
      pdf.text(addr, tx, y + 10);
      let hy = y + 10 + addr.length * 3.3;
      pdf.text(`${COMPANY.phone}  |  ${COMPANY.email}  |  ${COMPANY.website}`, tx, hy);
      pdf.text(`GSTIN: ${COMPANY.gst}`, tx, hy + 4);
      y = Math.max(y + 16, hy + 4) + 4;

      pdf.setDrawColor(...navy); pdf.setLineWidth(0.5); pdf.line(LEFT, y, PW - RIGHT, y); y += 6;

      // ISO strip
      pdf.setFillColor(255, 251, 235); pdf.setDrawColor(...amber); pdf.setLineWidth(0.3);
      pdf.roundedRect(LEFT, y, contentW, 8, 1.5, 1.5, "FD");
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(9); pdf.setTextColor(...navy);
      pdf.text(`${ISO_CERT.standard} Certified Company`, LEFT + 4, y + 5);
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(7.5); pdf.setTextColor(...gray);
      pdf.text(`${ISO_CERT.scope} · Certificate No.: ${ISO_CERT.number}`, PW - RIGHT - 4, y + 5, { align: "right" });
      y += 13;

      // title
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(18); pdf.setTextColor(...navy);
      pdf.text("WARRANTY CERTIFICATE", PW / 2, y, { align: "center" });
      pdf.setDrawColor(...amber); pdf.setLineWidth(1); pdf.line(PW / 2 - 22, y + 2.5, PW / 2 + 22, y + 2.5);
      y += 9;

      // cert no + date
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(10); pdf.setTextColor(...gray);
      pdf.setFont("helvetica", "bold"); pdf.text("Certificate No: ", LEFT, y);
      pdf.setFont("helvetica", "normal"); pdf.text(cert.certNo || "—", LEFT + 26, y);
      pdf.setFont("helvetica", "bold"); pdf.text(`Date: ${prettyDate(cert.issueDate)}`, PW - RIGHT, y, { align: "right" });
      y += 6;

      // intro
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(9.5); pdf.setTextColor(...gray);
      const intro = `This is to certify that the product(s) / equipment described below, manufactured and supplied by ${COMPANY.name}, is covered under warranty in favour of ${cert.customerName || "the customer"}${cert.customerCompany ? ` (${cert.customerCompany})` : ""}, subject to the coverage and terms stated herein.`;
      const introLines = pdf.splitTextToSize(intro, contentW) as string[];
      pdf.text(introLines, LEFT, y); y += introLines.length * 4.1 + 3;

      // ---------- customer details ----------
      const lc = (t: string) => ({ content: t, styles: { fontStyle: "bold" as const, fillColor: [245, 247, 250] as [number, number, number], textColor: [107, 114, 128] as [number, number, number] } });
      autoTable(pdf, {
        startY: y, margin: TABLE_MARGIN, theme: "grid", rowPageBreak: "avoid",
        styles: { fontSize: 9, cellPadding: 2, textColor: [17, 24, 39], lineColor: [209, 213, 219], lineWidth: 0.2 },
        columnStyles: { 0: { cellWidth: 26 }, 2: { cellWidth: 26 } },
        body: [
          [lc("CUSTOMER"), cert.customerName || "—", lc("COMPANY"), cert.customerCompany || "—"],
          [lc("PHONE"), cert.customerPhone || "—", lc("BILLING"), cert.customerAddress || "—"],
          [lc("SHIP TO"), { content: shipping.deliveryAddress || cert.customerAddress || "—", colSpan: 3 }],
        ],
      });
      y = lastY() + 7;

      // ---------- reusable section (heading kept with its table header + first row) ----------
      const section = (heading: string, head: string[], body: (string | number)[][], widths?: Record<number, number>) => {
        if (y + 8 + 8 + 8 > CONTENT_BOTTOM) { pdf.addPage(); y = TABLE_MARGIN.top; }
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); pdf.setTextColor(...navy);
        pdf.text(heading, LEFT, y);
        autoTable(pdf, {
          startY: y + 2.5, margin: TABLE_MARGIN, theme: "grid",
          showHead: "everyPage", rowPageBreak: "avoid",
          head: [head], body,
          headStyles: { fillColor: navy, textColor: [255, 255, 255], fontSize: 9, fontStyle: "bold", lineColor: navy, lineWidth: 0.1 },
          styles: { fontSize: 8.5, cellPadding: 2, lineColor: [229, 231, 235], lineWidth: 0.2, textColor: [55, 65, 81], overflow: "linebreak" },
          alternateRowStyles: { fillColor: [249, 250, 251] },
          columnStyles: widths ? Object.fromEntries(Object.entries(widths).map(([k, v]) => [k, { cellWidth: v }])) : undefined,
        });
        y = lastY() + 7;
      };

      section(
        "Products & Validity",
        ["#", "Product / Description", "Serial / Invoice", "Warranty", "Valid From", "Valid Until"],
        (productsForDoc.length ? productsForDoc : [blankProduct()]).map((p, i) => [i + 1, p.product || "—", p.serialNo || "—", p.warrantyPeriod || "—", prettyDate(p.validFrom), prettyDate(p.validUntil)]),
        { 0: 8, 2: 30, 3: 24, 4: 22, 5: 22 },
      );

      if (shipHasAny) {
        section(
          "Shipping / Delivery Details",
          ["Detail", "Information", "Detail", "Information"],
          [
            [shipEntries[0][0], shipEntries[0][1], shipEntries[1][0], shipEntries[1][1]],
            [shipEntries[2][0], shipEntries[2][1], shipEntries[3][0], shipEntries[3][1]],
            [shipEntries[4][0], shipEntries[4][1], shipEntries[5][0], shipEntries[5][1]],
            [shipEntries[6][0], shipEntries[6][1], shipEntries[7][0], shipEntries[7][1]],
          ],
          { 0: 34, 2: 34 },
        );
      }

      section(
        "Warranty Coverage",
        ["#", "Component / Scope", "Coverage / Duration", "Remarks"],
        (rowsForDoc.length ? rowsForDoc : [{ component: "—", coverage: "—", remarks: "" }]).map((r, i) => [i + 1, r.component || "—", r.coverage || "—", r.remarks || "—"]),
        { 0: 8, 2: 42 },
      );

      // ---------- terms (heading kept with first lines; wraps across pages cleanly) ----------
      if (cert.terms.trim()) {
        const termsLines = pdf.splitTextToSize(cert.terms, contentW) as string[];
        if (y + 6 + Math.min(termsLines.length, 3) * 4 > CONTENT_BOTTOM) { pdf.addPage(); y = TABLE_MARGIN.top; }
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); pdf.setTextColor(...navy);
        pdf.text("Terms & Conditions", LEFT, y); y += 5;
        pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.5); pdf.setTextColor(...gray);
        for (const line of termsLines) {
          if (y > CONTENT_BOTTOM) { pdf.addPage(); y = TABLE_MARGIN.top; }
          pdf.text(line, LEFT, y); y += 4;
        }
        y += 3;
      }

      // ---------- signature + seal (never split) ----------
      const sigH = 34;
      if (y + sigH > CONTENT_BOTTOM) { pdf.addPage(); y = TABLE_MARGIN.top; }
      y += 8;
      pdf.setDrawColor(...amber); pdf.setLineWidth(0.5); pdf.setLineDashPattern([1, 1], 0);
      pdf.circle(LEFT + 13, y + 11, 11, "S");
      pdf.setLineDashPattern([], 0);
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); pdf.setTextColor(...amber);
      pdf.text("SEAL", LEFT + 13, y + 12, { align: "center" });
      const sigX = PW - RIGHT - 58, sigMid = (sigX + (PW - RIGHT)) / 2;
      pdf.setDrawColor(150, 150, 150); pdf.setLineWidth(0.3); pdf.line(sigX, y + 18, PW - RIGHT, y + 18);
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(9.5); pdf.setTextColor(17, 24, 39);
      pdf.text(cert.signatory || "Authorised Signatory", sigMid, y + 22.5, { align: "center" });
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(...gray);
      pdf.text(`For ${COMPANY.name}`, sigMid, y + 26.5, { align: "center" });

      // ---------- decorate every page: border + fixed footer + page number ----------
      const total = pdf.getNumberOfPages();
      for (let i = 1; i <= total; i++) {
        pdf.setPage(i);
        pdf.setDrawColor(...navy); pdf.setLineWidth(1.2); pdf.rect(7, 7, 196, 283);
        pdf.setDrawColor(...amber); pdf.setLineWidth(0.5); pdf.rect(9, 9, 192, 279);
        pdf.setDrawColor(...amber); pdf.setLineWidth(0.3); pdf.line(LEFT, 280, PW - RIGHT, 280);
        pdf.setFont("helvetica", "italic"); pdf.setFontSize(7); pdf.setTextColor(110, 110, 110);
        const disc = pdf.splitTextToSize(LEGAL_FOOTER_TEXT, contentW - 26) as string[];
        pdf.text(disc, PW / 2, 284, { align: "center" });
        pdf.setFont("helvetica", "normal"); pdf.setFontSize(7.5); pdf.setTextColor(120, 120, 120);
        pdf.text(`Page ${i} of ${total}`, PW - RIGHT, 285.5, { align: "right" });
      }

      const safe = (cert.customerName || "Customer").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
      pdf.save(`Warranty-Certificate-${safe}.pdf`);
      toast({ title: "Certificate ready", description: "The warranty certificate PDF has been downloaded." });
    } catch (err: unknown) {
      console.error("Warranty certificate PDF generation failed:", err);
      const msg = err instanceof Error ? err.message : "";
      toast({ title: "Could not generate PDF", description: msg ? msg.slice(0, 140) : "Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const Field = (label: string, k: keyof typeof cert, placeholder?: string, type?: string) => (
    <LField label={label} value={cert[k]} placeholder={placeholder} type={type} onChange={(v) => set(k, v)} />
  );

  return (
    <div className="space-y-6">
      {/* Print (window.print) → a clean A4 certificate only: hide the rest of the page and fit
          #warranty-print to the A4 content area with 9 mm margins; the browser paginates a tall
          certificate onto extra pages. Scoped to this screen (the <style> mounts with this view). */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 9mm; }
          body * { visibility: hidden !important; }
          #warranty-print, #warranty-print * { visibility: visible !important; }
          #warranty-print {
            position: absolute !important;
            left: 0 !important; top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
          /* clean pagination: repeat table headers, never split a row / image / signature */
          #warranty-print thead { display: table-header-group !important; }
          #warranty-print tr { break-inside: avoid !important; page-break-inside: avoid !important; }
          #warranty-print img { break-inside: avoid !important; page-break-inside: avoid !important; }
        }
      `}</style>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" /> Warranty Certificate
          </h2>
          <p className="text-sm text-muted-foreground">Type the customer, product & warranty coverage — a branded certificate PDF is generated instantly.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetAll}><RotateCcw className="h-4 w-4 mr-2" />New</Button>
          <Button variant="outline" onClick={saveCertificate} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {savedId ? "Update" : "Save"}
          </Button>
          <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Print</Button>
          <Button onClick={downloadPDF} disabled={busy}><Download className="h-4 w-4 mr-2" />{busy ? "Generating…" : "Download PDF"}</Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_1fr]">
        {/* ---------------- Form ---------------- */}
        <div className="space-y-5">
          {/* Saved certificates — Load one to edit, or Delete it. */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                <FolderOpen className="h-4 w-4" /> Saved Certificates
              </h3>
              {savedId && <span className="text-[11px] font-medium text-accent">Editing a saved certificate</span>}
            </div>
            {listErr ? (
              <p className="text-[11px] leading-snug text-muted-foreground">
                Saving isn’t enabled yet — apply the <code className="rounded bg-muted px-1 text-foreground">warranty_certificates</code> migration
                to your Supabase database (SQL editor or <code className="rounded bg-muted px-1 text-foreground">supabase db push</code>), then reload.
              </p>
            ) : saved.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">No saved certificates yet — fill the form and press <span className="font-medium text-foreground">Save</span>.</p>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-auto pr-0.5">
                {saved.map((row) => (
                  <div key={row.id} className={cn("flex items-center gap-2 rounded-lg border p-2", row.id === savedId ? "border-accent bg-accent/5" : "border-border")}>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">{row.cert_no || "—"}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{row.customer_name || "—"} · {prettyDate(row.issue_date || "")}</div>
                    </div>
                    <button type="button" onClick={() => loadCertificate(row)}
                      className="shrink-0 rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:border-accent hover:text-accent">
                      Load
                    </button>
                    <button type="button" aria-label="Delete certificate" onClick={() => deleteCertificate(row.id)}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border text-muted-foreground hover:border-red-400 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Certificate</h3>
            <div className="grid grid-cols-2 gap-3">
              {Field("Certificate No.", "certNo")}
              {Field("Issue Date", "issueDate", undefined, "date")}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Customer</h3>
            {Field("Customer Name *", "customerName", "Full name")}
            <div className="grid grid-cols-2 gap-3">
              {Field("Company (optional)", "customerCompany", "Company")}
              {Field("Phone (optional)", "customerPhone", "Mobile")}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Address / City (optional)</Label>
              <Textarea rows={2} value={cert.customerAddress} placeholder="Site / billing address" onChange={(e) => set("customerAddress", e.target.value)} />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Products & Validity</h3>
              <Button size="sm" variant="outline" onClick={addProduct}><Plus className="h-3.5 w-3.5 mr-1" />Add product</Button>
            </div>
            <div className="space-y-3">
              {products.map((p, i) => (
                <div key={i} className="rounded-xl border border-border p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Product {i + 1}</span>
                    {products.length > 1 && (
                      <button type="button" aria-label="Remove product" onClick={() => removeProduct(i)}
                        className="grid h-7 w-7 place-items-center rounded-md border border-border text-muted-foreground hover:border-red-400 hover:text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <LField label="Product / Cabin Description" value={p.product} placeholder="e.g. Portable Office Cabin 20 × 10 ft (PUF)" onChange={(v) => setProduct(i, "product", v)} />
                  <div className="grid grid-cols-2 gap-3">
                    <LField label="Serial / Invoice No. (optional)" value={p.serialNo} placeholder="INV / Sr. no." onChange={(v) => setProduct(i, "serialNo", v)} />
                    <LField label="Warranty Period" value={p.warrantyPeriod} placeholder="e.g. 12 Months" onChange={(v) => setProduct(i, "warrantyPeriod", v)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <LField label="Valid From" type="date" value={p.validFrom} onChange={(v) => setProduct(i, "validFrom", v)} />
                    <LField label="Valid Until" type="date" value={p.validUntil} onChange={(v) => setProduct(i, "validUntil", v)} />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">Add a row per warrantied product — each keeps its own serial no., warranty period and validity dates.</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Shipping / Delivery Details</h3>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Delivery / Site Address (optional)</Label>
              <Textarea rows={2} value={shipping.deliveryAddress} placeholder="Delivery site address" onChange={(e) => setShip("deliveryAddress", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <LField label="Dispatch Date" type="date" value={shipping.dispatchDate} onChange={(v) => setShip("dispatchDate", v)} />
              <LField label="Delivery Date" type="date" value={shipping.deliveryDate} onChange={(v) => setShip("deliveryDate", v)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <LField label="Transporter / Courier" value={shipping.transporter} placeholder="Transport company" onChange={(v) => setShip("transporter", v)} />
              <LField label="Vehicle No." value={shipping.vehicleNo} placeholder="e.g. TN 00 AB 0000" onChange={(v) => setShip("vehicleNo", v)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <LField label="LR / Docket No." value={shipping.lrNo} placeholder="LR / Docket" onChange={(v) => setShip("lrNo", v)} />
              <LField label="No. of Units / Packages" value={shipping.units} placeholder="e.g. 2 units" onChange={(v) => setShip("units", v)} />
            </div>
            <LField label="Delivery Contact (optional)" value={shipping.contact} placeholder="Name & phone at site" onChange={(v) => setShip("contact", v)} />
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Warranty Coverage</h3>
              <Button size="sm" variant="outline" onClick={() => addItem()}><Plus className="h-3.5 w-3.5 mr-1" />Add row</Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_COMPONENTS.map((c) => (
                <button key={c} type="button" onClick={() => addItem(c)}
                  className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:border-accent/50 hover:text-accent transition-colors">
                  + {c}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {items.map((row, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                  <Input value={row.component} placeholder="Component / Scope" onChange={(e) => setItem(i, "component", e.target.value)} />
                  <Input value={row.coverage} placeholder="Coverage / Duration" onChange={(e) => setItem(i, "coverage", e.target.value)} />
                  <Input value={row.remarks} placeholder="Remarks (optional)" onChange={(e) => setItem(i, "remarks", e.target.value)} />
                  <button type="button" aria-label="Remove row" onClick={() => removeItem(i)}
                    className="grid h-9 w-9 place-items-center rounded-md border border-border text-muted-foreground hover:border-red-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">Type each warranty item manually — e.g. “Structure / MS Frame” · “10 Years” · “against manufacturing defects”.</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Terms & Signatory</h3>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Terms & Conditions</Label>
              <Textarea rows={5} value={cert.terms} onChange={(e) => set("terms", e.target.value)} />
            </div>
            {Field("Authorised Signatory", "signatory")}
          </div>
        </div>

        {/* ---------------- Live certificate preview ---------------- */}
        <div className="overflow-x-auto">
          <div
            ref={printRef}
            id="warranty-print"
            style={{ width: 794, margin: "0 auto", background: "#ffffff", color: "#1f2937" }}
            className="shadow-xl"
          >
            {/* decorative outer frame */}
            <div style={{ border: `10px solid ${NAVY}`, padding: 4 }}>
              <div style={{ border: `2px solid ${AMBER}`, padding: "34px 40px" }}>
                {/* header */}
                <div style={{ display: "flex", alignItems: "center", gap: 16, borderBottom: `2px solid ${NAVY}`, paddingBottom: 16 }}>
                  <img src={logoDataUrl} alt="" style={{ height: 62, width: "auto", objectFit: "contain" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: NAVY, letterSpacing: 0.3 }}>{COMPANY.name}</div>
                    <div style={{ fontSize: 11, color: "#4b5563", marginTop: 2 }}>{COMPANY.address}</div>
                    <div style={{ fontSize: 11, color: "#4b5563" }}>
                      {COMPANY.phone} · {COMPANY.email} · {COMPANY.website}
                    </div>
                    <div style={{ fontSize: 11, color: "#4b5563", fontWeight: 600 }}>GSTIN: {COMPANY.gst}</div>
                  </div>
                </div>

                {/* ISO certification strip — wording kept in sync with IsoCertificationBadge (single source across the site) */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 8, marginTop: 12, padding: "7px 12px", border: `1px solid ${AMBER}`, borderRadius: 6, background: "#fffbeb" }}>
                  <ShieldCheck style={{ color: AMBER, width: 16, height: 16 }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>ISO 9001:2015 Certified Company</span>
                  <span style={{ fontSize: 11, color: "#6b7280" }}>· Quality Management System · Certificate No.: {ISO_CERT.number}</span>
                </div>

                {/* title */}
                <div style={{ textAlign: "center", margin: "18px 0 10px" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 26, fontWeight: 800, color: NAVY, letterSpacing: 2 }}>
                    <Award style={{ color: AMBER }} /> WARRANTY CERTIFICATE
                  </div>
                  <div style={{ height: 3, width: 120, background: AMBER, margin: "8px auto 0", borderRadius: 2 }} />
                </div>

                {/* cert no + date */}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#374151", marginBottom: 14 }}>
                  <span><strong>Certificate No:</strong> {cert.certNo || "—"}</span>
                  <span><strong>Date:</strong> {prettyDate(cert.issueDate)}</span>
                </div>

                {/* intro */}
                <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "#374151", margin: "0 0 14px" }}>
                  This is to certify that the product(s) / equipment described below, manufactured and supplied by{" "}
                  <strong>{COMPANY.name}</strong>, is covered under warranty in favour of{" "}
                  <strong>{cert.customerName || "the customer"}</strong>
                  {cert.customerCompany ? <> ({cert.customerCompany})</> : null}, subject to the coverage and terms stated herein.
                </p>

                {/* customer details — includes both the billing and the shipping/delivery address */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, border: "1px solid #d1d5db", fontSize: 12 }}>
                  {[
                    { label: "Customer", val: cert.customerName || "—", full: false },
                    { label: "Company", val: cert.customerCompany || "—", full: false },
                    { label: "Phone", val: cert.customerPhone || "—", full: false },
                    { label: "Billing Address", val: cert.customerAddress || "—", full: false },
                    // Shipping / delivery address shown under the customer block; falls back to the
                    // billing address when no separate delivery address was entered below.
                    { label: "Shipping Address", val: shipping.deliveryAddress || cert.customerAddress || "—", full: true },
                  ].map(({ label, val, full }, idx) => (
                    <div key={idx} style={{ padding: "7px 10px", borderBottom: "1px solid #e5e7eb", borderRight: !full && idx % 2 === 0 ? "1px solid #e5e7eb" : "none", gridColumn: full ? "1 / -1" : "auto" }}>
                      <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
                      <div style={{ color: "#111827", fontWeight: 600 }}>{val}</div>
                    </div>
                  ))}
                </div>

                {/* products & validity */}
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 6 }}>Products &amp; Validity</div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: NAVY, color: "#fff" }}>
                        <th style={{ padding: "6px 8px", textAlign: "left", width: 26 }}>#</th>
                        <th style={{ padding: "6px 8px", textAlign: "left" }}>Product / Description</th>
                        <th style={{ padding: "6px 8px", textAlign: "left", width: 118 }}>Serial / Invoice</th>
                        <th style={{ padding: "6px 8px", textAlign: "left", width: 92 }}>Warranty</th>
                        <th style={{ padding: "6px 8px", textAlign: "left", width: 82 }}>Valid From</th>
                        <th style={{ padding: "6px 8px", textAlign: "left", width: 82 }}>Valid Until</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(productsForDoc.length ? productsForDoc : [blankProduct()]).map((p, i) => (
                        <tr key={i} style={{ background: i % 2 ? "#f9fafb" : "#fff" }}>
                          <td style={{ padding: "6px 8px", border: "1px solid #e5e7eb", color: "#374151" }}>{i + 1}</td>
                          <td style={{ padding: "6px 8px", border: "1px solid #e5e7eb", color: "#111827", fontWeight: 600 }}>{p.product || "—"}</td>
                          <td style={{ padding: "6px 8px", border: "1px solid #e5e7eb", color: "#374151" }}>{p.serialNo || "—"}</td>
                          <td style={{ padding: "6px 8px", border: "1px solid #e5e7eb", color: "#b45309", fontWeight: 700 }}>{p.warrantyPeriod || "—"}</td>
                          <td style={{ padding: "6px 8px", border: "1px solid #e5e7eb", color: "#374151" }}>{prettyDate(p.validFrom)}</td>
                          <td style={{ padding: "6px 8px", border: "1px solid #e5e7eb", color: "#374151" }}>{prettyDate(p.validUntil)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* shipping / delivery details (shown only when provided) */}
                {shipHasAny && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 6 }}>Shipping / Delivery Details</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, border: "1px solid #d1d5db", fontSize: 12 }}>
                      {shipEntries.map(([label, val], idx) => (
                        <div key={idx} style={{ padding: "7px 10px", borderBottom: "1px solid #e5e7eb", borderRight: idx % 2 === 0 ? "1px solid #e5e7eb" : "none" }}>
                          <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
                          <div style={{ color: "#111827", fontWeight: 600 }}>{val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* coverage table */}
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 6 }}>Warranty Coverage</div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: NAVY, color: "#fff" }}>
                        <th style={{ padding: "6px 8px", textAlign: "left", width: 34 }}>#</th>
                        <th style={{ padding: "6px 8px", textAlign: "left" }}>Component / Scope</th>
                        <th style={{ padding: "6px 8px", textAlign: "left", width: 150 }}>Coverage / Duration</th>
                        <th style={{ padding: "6px 8px", textAlign: "left" }}>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(rowsForDoc.length ? rowsForDoc : [{ component: "—", coverage: "—", remarks: "" }]).map((r, i) => (
                        <tr key={i} style={{ background: i % 2 ? "#f9fafb" : "#fff" }}>
                          <td style={{ padding: "6px 8px", border: "1px solid #e5e7eb", color: "#374151" }}>{i + 1}</td>
                          <td style={{ padding: "6px 8px", border: "1px solid #e5e7eb", color: "#111827", fontWeight: 600 }}>{r.component || "—"}</td>
                          <td style={{ padding: "6px 8px", border: "1px solid #e5e7eb", color: AMBER === "#f59e0b" ? "#b45309" : NAVY, fontWeight: 700 }}>{r.coverage || "—"}</td>
                          <td style={{ padding: "6px 8px", border: "1px solid #e5e7eb", color: "#374151" }}>{r.remarks || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* terms */}
                {cert.terms.trim() && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 4 }}>Terms & Conditions</div>
                    <div style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{cert.terms}</div>
                  </div>
                )}

                {/* signatory + seal */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 34 }}>
                  <div style={{ textAlign: "center", color: "#6b7280", fontSize: 11 }}>
                    <div style={{ width: 92, height: 92, borderRadius: "50%", border: `2px dashed ${AMBER}`, display: "flex", alignItems: "center", justifyContent: "center", color: AMBER, fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>
                      Seal
                    </div>
                  </div>
                  <div style={{ textAlign: "center", minWidth: 210 }}>
                    <div style={{ height: 36 }} />
                    <div style={{ borderTop: "1px solid #9ca3af", paddingTop: 5, fontSize: 12, color: "#111827", fontWeight: 700 }}>{cert.signatory || "Authorised Signatory"}</div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>For {COMPANY.name}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
