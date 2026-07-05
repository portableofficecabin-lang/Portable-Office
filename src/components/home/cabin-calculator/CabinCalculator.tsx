"use client";

import { useEffect, useId, useMemo, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Building, Briefcase, Shield, Bath, BedDouble, Container, LayoutGrid, Warehouse,
  ArrowLeft, ArrowRight, Check, Loader2, Send, Download, MessageCircle,
  RotateCcw, Ruler, Zap, Sofa, Truck, DoorOpen, PanelsTopLeft, CheckCircle2, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import {
  PRODUCTS, STRUCTURES, WALL_MATERIALS, CEILING_MATERIALS, FLOORING_MATERIALS,
  DOOR_TYPES, WINDOW_TYPES, ELECTRICAL_ITEMS, ADDONS,
  buildDefaultConfig, computeEstimate, summariseConfig, formatINR,
  type CabinConfig, type Material, type Estimate,
} from "./pricing";

const WHATSAPP_NUMBER = "919731897976";
const STORAGE_KEY = "poc_cabin_config_v1";

const ICONS: Record<string, React.ElementType> = {
  building: Building, briefcase: Briefcase, shield: Shield, bath: Bath,
  bedDouble: BedDouble, container: Container, layout: LayoutGrid, warehouse: Warehouse,
};

const STEPS = [
  { key: "product", title: "Product", icon: Building },
  { key: "size", title: "Size", icon: Ruler },
  { key: "structure", title: "Structure", icon: PanelsTopLeft },
  { key: "interior", title: "Interior", icon: LayoutGrid },
  { key: "openings", title: "Doors & Windows", icon: DoorOpen },
  { key: "electrical", title: "Electrical", icon: Zap },
  { key: "addons", title: "Add-ons", icon: Sofa },
  { key: "delivery", title: "Delivery", icon: Truck },
  { key: "quote", title: "Get Quotation", icon: Send },
] as const;

const badgeStyles: Record<string, string> = {
  "Most Chosen": "bg-accent text-white",
  "Best Value": "bg-emerald-500 text-white",
  "Premium": "bg-navy-light text-white",
};

/* ---------------------------------------------------------------- */
/* Small building blocks                                            */
/* ---------------------------------------------------------------- */

function Stepper({
  value, onChange, min = 0, max = 999, className, label,
}: { value: number; onChange: (n: number) => void; min?: number; max?: number; className?: string; label: string }) {
  const set = (n: number) => onChange(Math.min(Math.max(n, min), max));
  return (
    <div className={cn("inline-flex items-center rounded-lg border border-border bg-background", className)}>
      <button type="button" aria-label={`Decrease ${label}`} onClick={() => set(value - 1)}
        className="h-9 w-9 grid place-items-center text-lg font-semibold text-muted-foreground hover:text-accent disabled:opacity-40"
        disabled={value <= min}>−</button>
      <input type="number" inputMode="numeric" aria-label={label} value={Number.isFinite(value) ? value : ""}
        onChange={(e) => set(parseInt(e.target.value, 10) || min)}
        className="h-9 w-12 border-x border-border bg-transparent text-center text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
      <button type="button" aria-label={`Increase ${label}`} onClick={() => set(value + 1)}
        className="h-9 w-9 grid place-items-center text-lg font-semibold text-muted-foreground hover:text-accent disabled:opacity-40"
        disabled={value >= max}>+</button>
    </div>
  );
}

function DimField({
  label, value, onChange, suffix = "ft", optional,
}: { label: string; value: number; onChange: (n: number) => void; suffix?: string; optional?: boolean }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label} {optional && <span className="opacity-60">(optional)</span>}
      </Label>
      <div className="relative">
        <Input id={id} type="number" inputMode="decimal" min={0} value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)} className="pr-9" />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>
      </div>
    </div>
  );
}

/** A price-aware selectable pill for materials / door / window types. */
function MaterialChip({
  item, selected, onSelect,
}: { item: Material & { price?: number }; selected: boolean; onSelect: () => void }) {
  const delta = item.delta;
  const badge = item.standard
    ? "Standard"
    : delta === 0 ? "" : delta > 0 ? `+₹${delta}/sqft` : `−₹${Math.abs(delta)}/sqft`;
  return (
    <button type="button" onClick={onSelect} aria-pressed={selected}
      className={cn(
        "flex flex-col items-start gap-0.5 rounded-xl border px-3.5 py-2.5 text-left transition-all",
        selected ? "border-accent bg-accent/10 ring-1 ring-accent shadow-sm" : "border-border bg-background hover:border-accent/50",
      )}>
      <span className="text-sm font-semibold text-foreground">{item.label}</span>
      {badge && (
        <span className={cn("text-[11px] font-medium",
          item.standard ? "text-muted-foreground" : delta > 0 ? "text-accent" : "text-emerald-500")}>
          {badge}
        </span>
      )}
    </button>
  );
}

function PricedChip({
  label, price, selected, onSelect,
}: { label: string; price: number; selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} aria-pressed={selected}
      className={cn(
        "flex flex-col items-start gap-0.5 rounded-xl border px-3.5 py-2.5 text-left transition-all",
        selected ? "border-accent bg-accent/10 ring-1 ring-accent shadow-sm" : "border-border bg-background hover:border-accent/50",
      )}>
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <span className="text-[11px] font-medium text-accent">{formatINR(price)} each</span>
    </button>
  );
}

/* ---------------------------------------------------------------- */
/* Live 2D floor-plan preview                                       */
/* ---------------------------------------------------------------- */
function FloorPreview({ length, width, doors, windows }: { length: number; width: number; doors: number; windows: number }) {
  const L = Math.max(1, length), W = Math.max(1, width);
  const maxW = 300, maxH = 180;
  const scale = Math.min(maxW / L, maxH / W);
  const w = L * scale, h = W * scale;
  const pad = 26;
  const vbW = w + pad * 2, vbH = h + pad * 2;
  const doorArr = Array.from({ length: Math.min(doors, 8) }, (_, i) => i);
  const winArr = Array.from({ length: Math.min(windows, 12) }, (_, i) => i);
  return (
    <svg viewBox={`0 0 ${vbW} ${vbH}`} className="w-full h-auto" role="img" aria-label={`Floor plan ${length} by ${width} feet`}>
      <rect x={pad} y={pad} width={w} height={h} rx={4}
        fill="hsl(var(--accent) / 0.08)" stroke="hsl(var(--accent))" strokeWidth={2} />
      {doorArr.map((i) => {
        const x = pad + (w * (i + 0.5)) / Math.max(doors, 1);
        return <rect key={`d${i}`} x={x - 9} y={pad + h - 3} width={18} height={6} rx={1} fill="hsl(var(--accent))" />;
      })}
      {winArr.map((i) => {
        const x = pad + (w * (i + 0.5)) / Math.max(windows, 1);
        return <rect key={`w${i}`} x={x - 10} y={pad - 3} width={20} height={6} rx={1} fill="hsl(var(--accent) / 0.55)" />;
      })}
      <text x={pad + w / 2} y={pad + h + 16} textAnchor="middle" fontSize={11} fill="hsl(var(--muted-foreground))">{length} ft</text>
      <text x={pad - 10} y={pad + h / 2} textAnchor="middle" fontSize={11} fill="hsl(var(--muted-foreground))"
        transform={`rotate(-90 ${pad - 10} ${pad + h / 2})`}>{width} ft</text>
    </svg>
  );
}

/* ---------------------------------------------------------------- */
/* Estimate breakdown panel                                         */
/* ---------------------------------------------------------------- */
function EstimateRows({ est, gstOn }: { est: Estimate; gstOn: boolean }) {
  const Row = ({ label, value, positive, muted }: { label: string; value: string; positive?: boolean; muted?: boolean }) => (
    <div className="flex items-baseline justify-between gap-3 py-1 text-sm">
      <span className={cn(muted ? "text-muted-foreground" : "text-foreground/90")}>{label}</span>
      <span className={cn("font-mono font-medium tabular-nums", positive ? "text-accent" : "text-foreground")}>{value}</span>
    </div>
  );
  return (
    <div className="space-y-0.5">
      <div className="flex items-baseline justify-between gap-3 py-1 text-xs uppercase tracking-wide text-muted-foreground">
        <span>Cabin Size</span>
        <span>{est.area} sq.ft{est.quantity > 1 ? ` × ${est.quantity}` : ""}</span>
      </div>
      <Row label="Base Cabin" value={formatINR(est.base)} />
      {est.interior !== 0 && <Row label="Interior Upgrade" value={`${est.interior > 0 ? "+" : ""}${formatINR(est.interior)}`} positive={est.interior > 0} />}
      {est.openings > 0 && <Row label="Doors & Windows" value={`+${formatINR(est.openings)}`} positive />}
      {est.electrical > 0 && <Row label="Electrical" value={`+${formatINR(est.electrical)}`} positive />}
      {est.furniture > 0 && <Row label="Furniture / Add-ons" value={`+${formatINR(est.furniture)}`} positive />}
      {est.quantity > 1 && (
        <div className="mt-1 border-t border-dashed border-border pt-1">
          <Row label={`Per cabin`} value={formatINR(est.perCabin)} muted />
          <Row label={`× ${est.quantity} cabins`} value={formatINR(est.cabinsSubtotal)} />
        </div>
      )}
      {est.transport > 0 && <Row label="Transport" value={`+${formatINR(est.transport)}`} positive />}
      {est.installation > 0 && <Row label="Installation" value={`+${formatINR(est.installation)}`} positive />}
      <div className="mt-1 border-t border-border pt-1.5">
        <Row label="Subtotal" value={formatINR(est.subtotal)} muted />
        {gstOn && <Row label="GST (18%)" value={`+${formatINR(est.gst)}`} muted />}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Main component                                                   */
/* ---------------------------------------------------------------- */
export default function CabinCalculator() {
  const [config, setConfig] = useState<CabinConfig>(() => buildDefaultConfig());
  const [step, setStep] = useState(0);
  const [restored, setRestored] = useState(false);
  const [showMobileBreakdown, setShowMobileBreakdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [lead, setLead] = useState({ name: "", company: "", phone: "", email: "", city: "", state: "", notes: "" });
  // Mobile sticky bar is portaled to <body> (so ancestor containment / content-visibility
  // can't scope its position:fixed to the section) and only shown while the calculator is
  // actually on screen.
  const [barInView, setBarInView] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const notesId = useId();

  const est = useMemo(() => computeEstimate(config), [config]);

  // Only render the body portal after mount (document is guaranteed available; the
  // island is ssr:false so there is no hydration pass, but this keeps it defensive).
  useEffect(() => { setPortalReady(true); }, []);

  // Track whether the calculator is in the viewport so the mobile total bar shows
  // only while the user is customizing — not pinned across the whole page.
  useEffect(() => {
    const el = topRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => setBarInView(entries.some((e) => e.isIntersecting)),
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Restore a previously saved configuration (Save & Continue Later).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as CabinConfig;
        if (saved?.productId && PRODUCTS.some((p) => p.id === saved.productId)) {
          setConfig({ ...buildDefaultConfig(saved.productId), ...saved });
          setRestored(true);
        }
      }
    } catch { /* ignore corrupt storage */ }
  }, []);

  // Persist configuration on every change.
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)); } catch { /* quota / private mode */ }
  }, [config]);

  const patch = useCallback((p: Partial<CabinConfig>) => setConfig((c) => ({ ...c, ...p })), []);

  const goTo = (n: number) => {
    setStep(Math.min(Math.max(n, 0), STEPS.length - 1));
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // When the product changes, reset size to that product's sensible default and
  // re-seed the auto electrical quantities.
  const selectProduct = (productId: string) => {
    const fresh = buildDefaultConfig(productId);
    setConfig((c) => ({
      ...fresh,
      // keep the user's structure / interior / add-on / quantity choices if they had any
      // (size resets to the new product's default, but unit count is orthogonal to product)
      quantity: c.quantity,
      structureId: c.structureId, wallId: c.wallId, ceilingId: c.ceilingId, flooringId: c.flooringId,
      doorTypeId: c.doorTypeId, doorQty: c.doorQty, windowTypeId: c.windowTypeId, windowQty: c.windowQty,
      addons: c.addons, transport: c.transport, installation: c.installation, gst: c.gst,
    }));
  };

  const toggleElectrical = (id: string) => {
    const item = ELECTRICAL_ITEMS.find((e) => e.id === id)!;
    setConfig((c) => {
      const next = { ...c.electrical };
      if (next[id]) delete next[id];
      else next[id] = item.defaultQty(c.length * c.width);
      return { ...c, electrical: next };
    });
  };
  const setElectricalQty = (id: string, qty: number) =>
    setConfig((c) => ({ ...c, electrical: { ...c.electrical, [id]: Math.max(1, qty) } }));

  const toggleAddon = (id: string) =>
    setConfig((c) => {
      const next = { ...c.addons };
      if (next[id]) delete next[id];
      else next[id] = 1;
      return { ...c, addons: next };
    });
  const setAddonQty = (id: string, qty: number) =>
    setConfig((c) => ({ ...c, addons: { ...c.addons, [id]: Math.max(1, qty) } }));

  const startOver = () => {
    setConfig(buildDefaultConfig());
    setStep(0);
    setRestored(false);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  };

  /* ---- Share / export ---- */
  const shareWhatsApp = () => {
    const text = `Hi, I configured a cabin on your website and would like a quotation.\n\n${summariseConfig(config, est)}`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };

  const downloadPDF = async () => {
    try {
      const [{ default: jsPDF }, autoTableMod, { addLegalFooter }] = await Promise.all([
        import("jspdf"), import("jspdf-autotable"), import("@/lib/pdfFooter"),
      ]);
      const autoTable = autoTableMod.default;
      type CellHookData = Parameters<NonNullable<Parameters<typeof autoTable>[1]["didParseCell"]>>[0];
      const doc = new jsPDF({ unit: "mm", format: "a4" }) as InstanceType<typeof jsPDF> & { lastAutoTable: { finalY: number } };
      const product = PRODUCTS.find((p) => p.id === config.productId)!;
      doc.setFillColor(15, 27, 45);
      doc.rect(0, 0, 210, 26, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold"); doc.setFontSize(15);
      doc.text("Portable Office Cabin", 14, 12);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9);
      doc.setTextColor(245, 158, 11);
      doc.text("Estimated Cabin Quotation", 14, 18);
      doc.setTextColor(255, 255, 255); doc.setFontSize(8);
      doc.text(new Date().toLocaleDateString("en-IN"), 196, 12, { align: "right" });

      doc.setTextColor(20, 20, 20); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
      doc.text(`${product.label} — ${est.dimLength} × ${est.dimWidth} ft (${est.area} sq.ft) × ${est.quantity}`, 14, 36);

      autoTable(doc, {
        startY: 41,
        head: [["Configuration", "Selection"]],
        body: [
          ["Structure", STRUCTURES.find((s) => s.id === config.structureId)?.label ?? ""],
          ["Internal Wall", WALL_MATERIALS.find((m) => m.id === config.wallId)?.label ?? ""],
          ["Ceiling", CEILING_MATERIALS.find((m) => m.id === config.ceilingId)?.label ?? ""],
          ["Flooring", FLOORING_MATERIALS.find((m) => m.id === config.flooringId)?.label ?? ""],
          ["Doors", `${config.doorQty} × ${DOOR_TYPES.find((d) => d.id === config.doorTypeId)?.label ?? ""}`],
          ["Windows", `${config.windowQty} × ${WINDOW_TYPES.find((d) => d.id === config.windowTypeId)?.label ?? ""}`],
          ["Electrical", est.electricalLines.map((l) => l.label).join(", ") || "—"],
          ["Add-ons", est.furnitureLines.map((l) => l.label).join(", ") || "—"],
        ],
        theme: "striped",
        headStyles: { fillColor: [30, 41, 59] },
        styles: { fontSize: 9 },
      });

      const rows: [string, string][] = [["Base Cabin", formatINR(est.base)]];
      if (est.interior) rows.push(["Interior Upgrade", formatINR(est.interior)]);
      if (est.openings) rows.push(["Doors & Windows", formatINR(est.openings)]);
      if (est.electrical) rows.push(["Electrical", formatINR(est.electrical)]);
      if (est.furniture) rows.push(["Furniture / Add-ons", formatINR(est.furniture)]);
      if (config.quantity > 1) rows.push([`Per-cabin subtotal × ${est.quantity}`, formatINR(est.cabinsSubtotal)]);
      if (est.transport) rows.push(["Transport", formatINR(est.transport)]);
      if (est.installation) rows.push(["Installation", formatINR(est.installation)]);
      rows.push(["Subtotal", formatINR(est.subtotal)]);
      if (config.gst) rows.push(["GST (18%)", formatINR(est.gst)]);
      rows.push(["Estimated Total", formatINR(est.total)]);

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 6,
        head: [["Price Breakdown", "Amount"]],
        body: rows,
        theme: "grid",
        headStyles: { fillColor: [245, 158, 11], textColor: [255, 255, 255] },
        styles: { fontSize: 9 },
        columnStyles: { 1: { halign: "right" } },
        didParseCell: (d: CellHookData) => {
          if (d.section === "body" && d.row.index === rows.length - 1) {
            d.cell.styles.fontStyle = "bold";
            d.cell.styles.fillColor = [248, 233, 209];
          }
        },
      });

      doc.setFontSize(8); doc.setTextColor(110, 110, 110); doc.setFont("helvetica", "italic");
      const disc = doc.splitTextToSize(
        "Disclaimer: This is an indicative estimate generated from the online configurator. The final quotation is verified and approved by our sales team based on exact specifications, delivery location and current material rates.",
        182,
      );
      doc.text(disc, 14, doc.lastAutoTable.finalY + 8);
      addLegalFooter(doc);
      doc.save(`Cabin-Estimate-${product.label.replace(/\s+/g, "-")}.pdf`);
    } catch (e) {
      toast({ title: "Could not generate PDF", description: "Please try again.", variant: "destructive" });
    }
  };

  /* ---- Lead submission ---- */
  const submitQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead.name.trim() || !lead.phone.trim() || !lead.email.trim()) {
      toast({ title: "Missing details", description: "Name, mobile and email are required.", variant: "destructive" });
      return;
    }
    // Basic mobile sanity check so the CRM doesn't receive junk like "call me".
    const digits = lead.phone.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) {
      toast({ title: "Invalid mobile number", description: "Please enter a valid mobile number (7–15 digits).", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const product = PRODUCTS.find((p) => p.id === config.productId)!;
    const message =
      `${summariseConfig(config, est)}\n\n— Contact —\nCity: ${lead.city || "—"}\nState: ${lead.state || "—"}` +
      (lead.notes.trim() ? `\nNotes: ${lead.notes.trim()}` : "");
    const enquiry: TablesInsert<"enquiries"> = {
      name: lead.name.trim(),
      email: lead.email.trim(),
      phone: lead.phone.trim(),
      company: lead.company.trim() || null,
      message,
      enquiry_type: "quote",
      subject: `Cabin Calculator Estimate — ${product.label} (${formatINR(est.total)})`,
      product_name: product.label,
      expected_value: Math.round(est.total),
      lead_source: "Homepage Cabin Calculator",
    };
    try {
      const { error } = await supabase.from("enquiries").insert(enquiry);
      if (error) throw error;
      supabase.functions.invoke("send-enquiry-notification", { body: enquiry }).catch(() => {});
      setSubmitted(true);
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
      toast({ title: "Quotation request sent!", description: "Our team will send a verified quotation within 24 hours." });
    } catch (err) {
      toast({ title: "Something went wrong", description: "Please try again or call us directly.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const StepIcon = STEPS[step].icon;
  const progress = (step / (STEPS.length - 1)) * 100;

  return (
    <div ref={topRef} className="scroll-mt-24">
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* ---------------- Left: wizard ---------------- */}
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-lg">
          {/* Progress header */}
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <StepIcon className="h-4 w-4 text-accent" />
                <span>Step {step + 1} of {STEPS.length}</span>
                <span className="text-muted-foreground">— {STEPS[step].title}</span>
              </div>
              {restored && step === 0 && (
                <span className="hidden sm:inline text-[11px] text-emerald-500 font-medium">Restored your saved design</span>
              )}
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-gradient-to-r from-accent to-amber-light transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            {/* Clickable step chips (desktop) */}
            <div className="mt-3 hidden flex-wrap gap-1.5 lg:flex">
              {STEPS.map((s, i) => (
                <button key={s.key} type="button" onClick={() => goTo(i)}
                  className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                    i === step ? "bg-accent text-white" : i < step ? "bg-accent/15 text-accent hover:bg-accent/25" : "bg-muted text-muted-foreground hover:text-foreground")}>
                  {s.title}
                </button>
              ))}
            </div>
          </div>

          {/* Step body */}
          <div className="min-h-[280px]">
            {step === 0 && (
              <StepShell title="Select your product" subtitle="Pick the cabin type closest to what you need.">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {PRODUCTS.map((p) => {
                    const Icon = ICONS[p.icon] ?? Building;
                    const active = config.productId === p.id;
                    return (
                      <button key={p.id} type="button" onClick={() => selectProduct(p.id)} aria-pressed={active}
                        className={cn("relative flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all",
                          active ? "border-accent bg-accent/10 ring-1 ring-accent shadow-sm" : "border-border bg-background hover:border-accent/50")}>
                        {p.badge && <span className={cn("absolute right-2 top-2 rounded-full px-1.5 py-0.5 text-[9px] font-bold", badgeStyles[p.badge])}>{p.badge}</span>}
                        <Icon className={cn("h-6 w-6", active ? "text-accent" : "text-muted-foreground")} />
                        <span className="mt-1 text-sm font-semibold leading-tight text-foreground">{p.label}</span>
                        <span className="text-[11px] leading-tight text-muted-foreground">{p.blurb}</span>
                      </button>
                    );
                  })}
                </div>
              </StepShell>
            )}

            {step === 1 && (
              <StepShell title="Enter the size" subtitle="Area and base price update live as you type.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid grid-cols-2 gap-3">
                    <DimField label="Length" value={config.length} onChange={(n) => patch({ length: n })} />
                    <DimField label="Width" value={config.width} onChange={(n) => patch({ width: n })} />
                    <DimField label="Height" value={config.height} onChange={(n) => patch({ height: n })} optional />
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Quantity</Label>
                      <Stepper value={config.quantity} min={1} max={500} label="Cabin quantity" onChange={(n) => patch({ quantity: n })} />
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-4">
                    <FloorPreview length={config.length} width={config.width} doors={config.doorQty} windows={config.windowQty} />
                    <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                      <div className="rounded-lg bg-muted p-2">
                        <p className="text-[11px] text-muted-foreground">Area</p>
                        <p className="font-bold text-foreground">{est.dimLength} × {est.dimWidth} = {est.area} sq.ft</p>
                      </div>
                      <div className="rounded-lg bg-accent/10 p-2">
                        <p className="text-[11px] text-muted-foreground">Base Price</p>
                        <p className="font-bold text-accent">{formatINR(est.base)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </StepShell>
            )}

            {step === 2 && (
              <StepShell title="Select structure" subtitle="The frame material affects durability and price.">
                <div className="grid gap-3 sm:grid-cols-3">
                  {STRUCTURES.map((s) => {
                    const active = config.structureId === s.id;
                    const rate = (est.area * (PRODUCTS.find((p) => p.id === config.productId)?.baseRatePerSqft ?? 0) * s.multiplier);
                    return (
                      <button key={s.id} type="button" onClick={() => patch({ structureId: s.id })} aria-pressed={active}
                        className={cn("flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-all",
                          active ? "border-accent bg-accent/10 ring-1 ring-accent shadow-sm" : "border-border bg-background hover:border-accent/50")}>
                        <span className="text-sm font-bold text-foreground">{s.label}</span>
                        <span className="text-[11px] leading-snug text-muted-foreground">{s.note}</span>
                        <span className="mt-1 text-xs font-semibold text-accent">{formatINR(rate)}</span>
                      </button>
                    );
                  })}
                </div>
              </StepShell>
            )}

            {step === 3 && (
              <StepShell title="Interior finish" subtitle="Standard finishes are included — upgrades and savings shown per material.">
                <div className="space-y-5">
                  <MaterialGroup label="Internal Wall" items={WALL_MATERIALS} value={config.wallId} onSelect={(id) => patch({ wallId: id })} />
                  <MaterialGroup label="Ceiling" items={CEILING_MATERIALS} value={config.ceilingId} onSelect={(id) => patch({ ceilingId: id })} />
                  <MaterialGroup label="Flooring" items={FLOORING_MATERIALS} value={config.flooringId} onSelect={(id) => patch({ flooringId: id })} />
                </div>
              </StepShell>
            )}

            {step === 4 && (
              <StepShell title="Doors & windows" subtitle="Choose type and quantity for each.">
                <div className="space-y-5">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <Label className="text-sm font-semibold">Door Type</Label>
                      <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Qty</span>
                        <Stepper value={config.doorQty} min={0} max={50} label="Door quantity" onChange={(n) => patch({ doorQty: n })} /></div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {DOOR_TYPES.map((d) => (
                        <PricedChip key={d.id} label={d.label} price={d.price} selected={config.doorTypeId === d.id} onSelect={() => patch({ doorTypeId: d.id })} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <Label className="text-sm font-semibold">Window Type</Label>
                      <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Qty</span>
                        <Stepper value={config.windowQty} min={0} max={100} label="Window quantity" onChange={(n) => patch({ windowQty: n })} /></div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {WINDOW_TYPES.map((d) => (
                        <PricedChip key={d.id} label={d.label} price={d.price} selected={config.windowTypeId === d.id} onSelect={() => patch({ windowTypeId: d.id })} />
                      ))}
                    </div>
                  </div>
                </div>
              </StepShell>
            )}

            {step === 5 && (
              <StepShell title="Electrical" subtitle="Tick what you need — quantities are auto-suggested from the area.">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {ELECTRICAL_ITEMS.map((item) => {
                    const selected = !!config.electrical[item.id];
                    return (
                      <ToggleCard key={item.id} selected={selected} onToggle={() => toggleElectrical(item.id)}
                        label={item.label} sub={`${formatINR(item.unitPrice)} each`}>
                        {selected && (
                          <Stepper value={config.electrical[item.id]} min={1} max={200} label={`${item.label} quantity`} onChange={(n) => setElectricalQty(item.id, n)} />
                        )}
                      </ToggleCard>
                    );
                  })}
                </div>
              </StepShell>
            )}

            {step === 6 && (
              <StepShell title="Optional add-ons" subtitle="Furniture & fittings — add only what you want.">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {ADDONS.map((a) => {
                    const selected = !!config.addons[a.id];
                    return (
                      <ToggleCard key={a.id} selected={selected} onToggle={() => toggleAddon(a.id)}
                        label={a.label} sub={`${formatINR(a.price)}${a.hasQty ? " each" : ""}`}>
                        {selected && a.hasQty && (
                          <Stepper value={config.addons[a.id]} min={1} max={200} label={`${a.label} quantity`} onChange={(n) => setAddonQty(a.id, n)} />
                        )}
                      </ToggleCard>
                    );
                  })}
                </div>
              </StepShell>
            )}

            {step === 7 && (
              <StepShell title="Delivery & taxes" subtitle="Transport and installation are optional and vary by location.">
                <div className="space-y-2.5">
                  <SwitchRow label="Transport Required?" sub={`Approx. ${formatINR(18000)} per cabin (varies by distance)`}
                    checked={config.transport} onChange={(v) => patch({ transport: v })} />
                  <SwitchRow label="Installation Required?" sub={`Approx. ${formatINR(15000)} per cabin`}
                    checked={config.installation} onChange={(v) => patch({ installation: v })} />
                  <SwitchRow label="Include GST (18%)" sub="Shown on the estimate total"
                    checked={config.gst} onChange={(v) => patch({ gst: v })} />
                </div>
              </StepShell>
            )}

            {step === 8 && (
              <StepShell title="Get your official quotation" subtitle="Review your estimate and request a verified quotation.">
                {submitted ? (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 py-10 text-center">
                    <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                    <h4 className="text-lg font-bold text-foreground">Request received!</h4>
                    <p className="max-w-sm text-sm text-muted-foreground">
                      Thank you, {lead.name.split(" ")[0] || "there"}. Our sales team will review your configuration and send a verified quotation within 24 hours.
                    </p>
                    <div className="mt-2 flex flex-wrap justify-center gap-2">
                      <Button variant="outline" onClick={downloadPDF}><Download className="h-4 w-4" /> Download Estimate</Button>
                      <Button variant="accent" onClick={shareWhatsApp}><MessageCircle className="h-4 w-4" /> Chat on WhatsApp</Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={submitQuotation} className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <LeadField label="Full Name *" value={lead.name} onChange={(v) => setLead({ ...lead, name: v })} required placeholder="Your name" />
                      <LeadField label="Company Name" value={lead.company} onChange={(v) => setLead({ ...lead, company: v })} placeholder="Company (optional)" />
                      <LeadField label="Mobile Number *" value={lead.phone} onChange={(v) => setLead({ ...lead, phone: v })} required type="tel" inputMode="tel" placeholder="10-digit mobile" />
                      <LeadField label="Email Address *" value={lead.email} onChange={(v) => setLead({ ...lead, email: v })} required type="email" placeholder="you@email.com" />
                      <LeadField label="City" value={lead.city} onChange={(v) => setLead({ ...lead, city: v })} placeholder="City" />
                      <LeadField label="State" value={lead.state} onChange={(v) => setLead({ ...lead, state: v })} placeholder="State" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={notesId} className="text-xs text-muted-foreground">Notes</Label>
                      <Textarea id={notesId} rows={2} value={lead.notes} onChange={(e) => setLead({ ...lead, notes: e.target.value })} placeholder="Anything specific about your requirement…" />
                    </div>
                    <div className="rounded-lg border border-dashed border-accent/40 bg-accent/5 p-3 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">Estimated Total: {formatINR(est.total)}{config.gst ? "" : " + GST"}</span> — this indicative price will be verified & approved by our sales team.
                    </div>
                    <Button type="submit" variant="hero" size="lg" className="w-full" disabled={submitting}>
                      {submitting ? <><Loader2 className="h-5 w-5 animate-spin" /> Sending…</> : <><Send className="h-5 w-5" /> Get My Official Quotation</>}
                    </Button>
                  </form>
                )}
              </StepShell>
            )}
          </div>

          {/* Nav */}
          <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
            <Button variant="ghost" onClick={() => goTo(step - 1)} disabled={step === 0} className="text-muted-foreground">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <button type="button" onClick={startOver} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-accent">
              <RotateCcw className="h-3 w-3" /> Start over
            </button>
            {step < STEPS.length - 1 ? (
              <Button variant="accent" onClick={() => goTo(step + 1)}>
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <span className="w-[76px]" />
            )}
          </div>
        </div>

        {/* ---------------- Right: sticky estimate (desktop) ---------------- */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-border bg-gradient-to-b from-card to-muted/20 p-5 shadow-lg">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">Live Estimate</h3>
            </div>
            <EstimateRows est={est} gstOn={config.gst} />
            <div className="mt-3 rounded-xl bg-gradient-to-r from-navy-medium to-navy-deep p-4 text-center">
              <p className="text-[11px] uppercase tracking-wide text-white/70">Estimated Total</p>
              <p className="font-display text-2xl font-extrabold text-white">{formatINR(est.total)}</p>
              {!config.gst && <p className="text-[11px] text-white/70">+ GST</p>}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={downloadPDF}><Download className="h-4 w-4" /> PDF</Button>
              <Button variant="outline" size="sm" onClick={shareWhatsApp}><MessageCircle className="h-4 w-4" /> Share</Button>
            </div>
            {step < STEPS.length - 1 && (
              <Button variant="hero" className="mt-2 w-full" onClick={() => goTo(STEPS.length - 1)}>
                Get Official Quotation
              </Button>
            )}
            <p className="mt-3 text-[10px] leading-snug text-muted-foreground">
              Indicative estimate. Final quotation is verified & approved by our sales team based on specifications, delivery location and selected options.
            </p>
          </div>
        </aside>
      </div>

      {/* ---------------- Sticky bottom bar (mobile) ----------------
          Portaled to <body> so an ancestor's content-visibility/contain (which would
          otherwise scope position:fixed to the section) can't stop it sticking to the
          viewport. Shown only while the calculator is on screen (barInView). Right
          padding (pr-20) keeps the CTA clear of the site's floating WhatsApp button. */}
      {portalReady && barInView && createPortal(
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur px-4 py-2.5 shadow-[0_-4px_20px_rgba(0,0,0,0.15)] lg:hidden">
          {showMobileBreakdown && (
            <div id="cabin-mobile-breakdown" className="mb-2 max-h-[45vh] overflow-y-auto rounded-xl border border-border bg-background p-3">
              <EstimateRows est={est} gstOn={config.gst} />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={downloadPDF}><Download className="h-4 w-4" /> PDF</Button>
                <Button variant="outline" size="sm" onClick={shareWhatsApp}><MessageCircle className="h-4 w-4" /> Share</Button>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 pr-20">
            <button type="button" onClick={() => setShowMobileBreakdown((s) => !s)}
              aria-expanded={showMobileBreakdown} aria-controls="cabin-mobile-breakdown" className="flex-1 text-left">
              <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">Estimated Total <span aria-hidden="true">{showMobileBreakdown ? "▾" : "▴"}</span></span>
              <span className="font-display text-lg font-extrabold text-foreground">{formatINR(est.total)}{!config.gst && <span className="text-xs font-medium text-muted-foreground"> +GST</span>}</span>
            </button>
            {step < STEPS.length - 1 ? (
              <Button variant="hero" size="sm" onClick={() => goTo(step + 1)}>Next <ArrowRight className="h-4 w-4" /></Button>
            ) : !submitted ? (
              <Button variant="hero" size="sm" onClick={() => topRef.current?.scrollIntoView({ behavior: "smooth" })}>Fill form ↑</Button>
            ) : (
              <Button variant="accent" size="sm" onClick={shareWhatsApp}><MessageCircle className="h-4 w-4" /> WhatsApp</Button>
            )}
          </div>
        </div>,
        document.body,
      )}
      {/* Spacer so the fixed mobile bar never covers the wizard's own bottom controls */}
      <div className="h-24 lg:hidden" />
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Presentational helpers                                           */
/* ---------------------------------------------------------------- */
function StepShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="animate-fade-in">
      <h3 className="font-display text-xl font-bold text-foreground">{title}</h3>
      <p className="mb-4 text-sm text-muted-foreground">{subtitle}</p>
      {children}
    </div>
  );
}

function MaterialGroup({ label, items, value, onSelect }: { label: string; items: Material[]; value: string; onSelect: (id: string) => void }) {
  return (
    <div>
      <Label className="mb-2 block text-sm font-semibold">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {items.map((m) => (
          <MaterialChip key={m.id} item={m} selected={value === m.id} onSelect={() => onSelect(m.id)} />
        ))}
      </div>
    </div>
  );
}

function ToggleCard({ selected, onToggle, label, sub, children }: {
  selected: boolean; onToggle: () => void; label: string; sub: string; children?: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-2 rounded-xl border p-3 transition-all",
      selected ? "border-accent bg-accent/10 ring-1 ring-accent" : "border-border bg-background")}>
      <button type="button" onClick={onToggle} aria-pressed={selected} className="flex flex-1 items-center gap-2.5 text-left">
        <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors",
          selected ? "border-accent bg-accent text-white" : "border-muted-foreground/40")}>
          {selected && <Check className="h-3.5 w-3.5" />}
        </span>
        <span>
          <span className="block text-sm font-semibold text-foreground">{label}</span>
          <span className="block text-[11px] text-muted-foreground">{sub}</span>
        </span>
      </button>
      {children}
    </div>
  );
}

function SwitchRow({ label, sub, checked, onChange }: { label: string; sub: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-4">
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground">{sub}</p>
      </div>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
        className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-accent" : "bg-muted-foreground/30")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-[22px]" : "translate-x-0.5")} />
      </button>
    </div>
  );
}

function LeadField({ label, value, onChange, required, type = "text", placeholder, inputMode }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string;
  placeholder?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label>
      <Input id={id} type={type} inputMode={inputMode} value={value} required={required} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
