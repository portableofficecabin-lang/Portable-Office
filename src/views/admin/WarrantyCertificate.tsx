"use client";

/**
 * WarrantyCertificate — admin tool to issue a branded Warranty Certificate for a
 * customer. Everything is typed manually (customer, product, and the warranty
 * coverage rows), a live certificate preview renders on the right, and "Download
 * PDF" rasterises that preview (html2canvas) into an A4 PDF — same approach the
 * Cabin Quotation admin tool uses. Self-contained: no DB table required.
 */

import { useEffect, useRef, useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { ShieldCheck, Download, Printer, Plus, Trash2, RotateCcw, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { resolveImageUrl } from "@/utils/resolveImageUrl";
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
  product: "",
  serialNo: "",
  warrantyPeriod: "",
  validFrom: "",
  validUntil: "",
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
  const [items, setItems] = useState<WItem[]>([{ component: "", coverage: "", remarks: "" }]);
  const [busy, setBusy] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Populate date-derived defaults on the client only (avoids any SSR/client mismatch).
  useEffect(() => {
    const iso = todayISO();
    setCert((c) => ({
      ...c,
      issueDate: c.issueDate || iso,
      validFrom: c.validFrom || iso,
      certNo: c.certNo || `POC/WC/${iso.slice(0, 4)}/001`,
    }));
  }, []);

  const set = (k: keyof typeof cert, v: string) => setCert((c) => ({ ...c, [k]: v }));
  const setItem = (i: number, k: keyof WItem, v: string) =>
    setItems((rows) => rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const addItem = (component = "") => setItems((rows) => [...rows, { component, coverage: "", remarks: "" }]);
  const removeItem = (i: number) => setItems((rows) => (rows.length > 1 ? rows.filter((_, idx) => idx !== i) : rows));

  const resetAll = () => {
    const iso = todayISO();
    setCert({ ...blankCert, issueDate: iso, validFrom: iso, certNo: `POC/WC/${iso.slice(0, 4)}/001` });
    setItems([{ component: "", coverage: "", remarks: "" }]);
  };

  const rowsForDoc = items.filter((r) => r.component.trim() || r.coverage.trim());

  const downloadPDF = async () => {
    if (!printRef.current) return;
    if (!cert.customerName.trim()) {
      toast({ title: "Customer name required", description: "Enter the customer name before downloading.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const canvas = await html2canvas(printRef.current, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
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
    } catch {
      toast({ title: "Could not generate PDF", description: "Please try again.", variant: "destructive" });
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
          <Button variant="outline" onClick={resetAll}><RotateCcw className="h-4 w-4 mr-2" />Reset</Button>
          <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Print</Button>
          <Button onClick={downloadPDF} disabled={busy}><Download className="h-4 w-4 mr-2" />{busy ? "Generating…" : "Download PDF"}</Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_1fr]">
        {/* ---------------- Form ---------------- */}
        <div className="space-y-5">
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

          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Product & Validity</h3>
            {Field("Product / Cabin Description", "product", "e.g. Portable Office Cabin 20 × 10 ft (PUF)")}
            <div className="grid grid-cols-2 gap-3">
              {Field("Serial / Invoice No. (optional)", "serialNo", "INV / Sr. no.")}
              {Field("Warranty Period", "warrantyPeriod", "e.g. 12 Months")}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Field("Valid From", "validFrom", undefined, "date")}
              {Field("Valid Until", "validUntil", undefined, "date")}
            </div>
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
                  <img src={resolveImageUrl(logo)} alt="" crossOrigin="anonymous" style={{ height: 62, width: "auto", objectFit: "contain" }} />
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
                  This is to certify that the product / equipment described below, manufactured and supplied by{" "}
                  <strong>{COMPANY.name}</strong>, is covered under warranty in favour of{" "}
                  <strong>{cert.customerName || "the customer"}</strong>
                  {cert.customerCompany ? <> ({cert.customerCompany})</> : null}, subject to the coverage and terms stated herein.
                </p>

                {/* customer + product grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, border: "1px solid #d1d5db", fontSize: 12 }}>
                  {[
                    ["Customer", cert.customerName || "—"],
                    ["Product", cert.product || "—"],
                    ["Company", cert.customerCompany || "—"],
                    ["Serial / Invoice No.", cert.serialNo || "—"],
                    ["Phone", cert.customerPhone || "—"],
                    ["Warranty Period", cert.warrantyPeriod || "—"],
                    ["Address", cert.customerAddress || "—"],
                    ["Valid", `${prettyDate(cert.validFrom)} — ${prettyDate(cert.validUntil)}`],
                  ].map(([label, val], idx) => (
                    <div key={idx} style={{ padding: "7px 10px", borderBottom: "1px solid #e5e7eb", borderRight: idx % 2 === 0 ? "1px solid #e5e7eb" : "none" }}>
                      <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
                      <div style={{ color: "#111827", fontWeight: 600 }}>{val}</div>
                    </div>
                  ))}
                </div>

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
