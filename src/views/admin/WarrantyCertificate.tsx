"use client";

/**
 * WarrantyCertificate — admin tool to issue a branded Warranty Certificate for a
 * customer. Everything is typed manually (customer, product, and the warranty
 * coverage rows), a live certificate preview renders on the right, and "Download
 * PDF" rasterises that preview (html2canvas) into an A4 PDF — same approach the
 * Cabin Quotation admin tool uses. Self-contained: no DB table required.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
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
import { addLegalFooter } from "@/lib/pdfFooter";
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

const NAVY = "#0f1b2d";
const AMBER = "#f59e0b";

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

  const downloadPDF = async () => {
    if (!printRef.current) return;
    if (!cert.customerName.trim()) {
      toast({ title: "Customer name required", description: "Enter the customer name before downloading.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        allowTaint: false,
        imageTimeout: 20000,
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = 210, pageH = 297;
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;
      // Fit onto a single A4 page (scale down if the rendered certificate is taller).
      if (imgH <= pageH) {
        pdf.addImage(imgData, "PNG", 0, 0, imgW, imgH);
      } else {
        const scaledW = (canvas.width * pageH) / canvas.height;
        pdf.addImage(imgData, "PNG", (pageW - scaledW) / 2, 0, scaledW, pageH);
      }
      addLegalFooter(pdf);
      const safe = (cert.customerName || "Customer").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
      pdf.save(`Warranty-Certificate-${safe}.pdf`);
      toast({ title: "Certificate ready", description: "The warranty certificate PDF has been downloaded." });
    } catch (err: any) {
      console.error("Warranty certificate PDF generation failed:", err);
      toast({
        title: "Could not generate PDF",
        description: err?.message ? String(err.message).slice(0, 140) : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const Field = (label: string, k: keyof typeof cert, placeholder?: string, type?: string) => (
    <LField label={label} value={cert[k]} placeholder={placeholder} type={type} onChange={(v) => set(k, v)} />
  );

  return (
    <div className="space-y-6">
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

                {/* title */}
                <div style={{ textAlign: "center", margin: "22px 0 10px" }}>
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
