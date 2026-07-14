"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Calculator, Save, Printer, FileText, Plus, Trash2 } from "lucide-react";
import { exportSheetToPdf, formatBytes } from "@/lib/pdf/sheetPdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NumberInput } from "@/components/admin/NumberInput";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatINR } from "@/lib/exportUtils";

type RoofType = "flat" | "sloped" | "sheet";
type WallType = "brick" | "sheet" | "sandwich";
type Unit = "ft" | "m";

interface Spec {
  length: number; width: number; height: number;
  doors: number; windows: number; rooms: number;
  roofType: RoofType; wallType: WallType; unit: Unit;
  heavyPoints: number;
}

interface BomItem {
  key: string; category: string; name: string; unit: string;
  qty: number; rate: number; gst: number;
}

const DEFAULT_SPEC: Spec = {
  length: 20, width: 10, height: 9,
  doors: 1, windows: 2, rooms: 1,
  roofType: "sheet", wallType: "sandwich", unit: "ft",
  heavyPoints: 1,
};

const DEFAULT_RATES: Record<string, { name: string; unit: string; rate: number; gst: number }> = {
  ms_pipe:        { name: "MS Pipe Tube",         unit: "ft",  rate: 85,  gst: 18 },
  ms_channel:     { name: "MS Channel",           unit: "ft",  rate: 110, gst: 18 },
  ms_sheet:       { name: "MS Sheet (roof)",      unit: "sqft", rate: 95,  gst: 18 },
  weld_rod:       { name: "Welding Rod",          unit: "kg",  rate: 220, gst: 18 },
  wp_paste:       { name: "Waterproofing Paste",  unit: "kg",  rate: 180, gst: 18 },
  primer:         { name: "Primer",               unit: "ltr", rate: 240, gst: 18 },
  paint:          { name: "Paint (2 coats)",      unit: "ltr", rate: 320, gst: 18 },
  wire15:         { name: "Wire 1.5 sq mm",       unit: "mtr", rate: 22,  gst: 18 },
  wire25:         { name: "Wire 2.5 sq mm",       unit: "mtr", rate: 32,  gst: 18 },
  conduit:        { name: "Conduit Pipe",         unit: "pcs", rate: 95,  gst: 18 },
  fan:            { name: "Ceiling Fan",          unit: "pcs", rate: 1800, gst: 18 },
  light:          { name: "LED Light",            unit: "pcs", rate: 320, gst: 18 },
  bulkhead:       { name: "Bulkhead Light",       unit: "pcs", rate: 480, gst: 18 },
  switch5:        { name: "Switch 5A",            unit: "pcs", rate: 65,  gst: 18 },
  socket5:        { name: "Socket 5A",            unit: "pcs", rate: 85,  gst: 18 },
  switch20:       { name: "Switch 20A",           unit: "pcs", rate: 145, gst: 18 },
  plate8m:        { name: "Modular Plate 8M",     unit: "pcs", rate: 220, gst: 18 },
  plate63m:       { name: "Modular Plate 6.3M",   unit: "pcs", rate: 180, gst: 18 },
};

function calcBOM(spec: Spec): BomItem[] {
  const factor = spec.unit === "m" ? 3.281 : 1;
  const L = spec.length * factor;
  const W = spec.width * factor;
  const H = spec.height * factor;
  const perim = 2 * (L + W);
  const floorArea = L * W;
  const wallArea = perim * H;
  const roofArea = L * W;

  const pipe = perim * H * 1.2;
  const channel = (L + W) * 2;
  const sheet = roofArea;
  const steelWeight = pipe * 1.5 + channel * 2.2 + sheet * 0.5;
  const weldRod = steelWeight * 0.02;

  const wpPaste = roofArea * 1.5;
  const primer = wallArea / 80;
  const paint = (wallArea / 60) * 2;

  const points = Math.max(spec.rooms * 4, 4);
  const wire15 = (L + W + H) * 3 * points * 0.3;
  const wire25 = (L + W) * 2 * Math.max(spec.heavyPoints, 1);
  const conduit = wire15 / 10;

  const fans = Math.max(1, Math.ceil(floorArea / 100));
  const lights = Math.max(1, Math.ceil(floorArea / 50));
  const bulkhead = spec.doors;
  const switch5 = lights;
  const socket5 = spec.rooms * 2;
  const switch20 = spec.heavyPoints;
  const plate8m = Math.ceil((switch5 + socket5) / 3);
  const plate63m = Math.ceil((switch5 + socket5) / 2 / 2);

  const r = DEFAULT_RATES;
  const items: BomItem[] = [
    { key: "ms_pipe",    category: "Structural", ...r.ms_pipe,    qty: round(pipe) },
    { key: "ms_channel", category: "Structural", ...r.ms_channel, qty: round(channel) },
    { key: "ms_sheet",   category: "Structural", ...r.ms_sheet,   qty: round(sheet) },
    { key: "weld_rod",   category: "Structural", ...r.weld_rod,   qty: round(weldRod) },
    { key: "wp_paste",   category: "Finishing",  ...r.wp_paste,   qty: round(wpPaste) },
    { key: "primer",     category: "Finishing",  ...r.primer,     qty: round(primer) },
    { key: "paint",      category: "Finishing",  ...r.paint,      qty: round(paint) },
    { key: "wire15",     category: "Wiring",     ...r.wire15,     qty: round(wire15) },
    { key: "wire25",     category: "Wiring",     ...r.wire25,     qty: round(wire25) },
    { key: "conduit",    category: "Wiring",     ...r.conduit,    qty: Math.ceil(conduit) },
    { key: "fan",        category: "Fixtures",   ...r.fan,        qty: fans },
    { key: "light",      category: "Fixtures",   ...r.light,      qty: lights },
    { key: "bulkhead",   category: "Fixtures",   ...r.bulkhead,   qty: bulkhead },
    { key: "switch5",    category: "Fixtures",   ...r.switch5,    qty: switch5 },
    { key: "socket5",    category: "Fixtures",   ...r.socket5,    qty: socket5 },
    { key: "switch20",   category: "Fixtures",   ...r.switch20,   qty: switch20 },
    { key: "plate8m",    category: "Plates",     ...r.plate8m,    qty: plate8m },
    { key: "plate63m",   category: "Plates",     ...r.plate63m,   qty: plate63m },
  ].map(i => ({ ...i, key: i.key, category: i.category, name: i.name, unit: i.unit, qty: i.qty, rate: i.rate, gst: i.gst }));
  return items;
}

const round = (n: number) => Math.round(n * 100) / 100;

// ============== 2D SVG Drawing ==============
function FloorPlan({ spec }: { spec: Spec }) {
  const ratio = spec.length / spec.width;
  const w = 380;
  const h = w / ratio;
  const padding = 40;
  const totalW = w + padding * 2;
  const totalH = h + padding * 2 + 40;

  const doors = Array.from({ length: spec.doors }, (_, i) => i);
  const windows = Array.from({ length: spec.windows }, (_, i) => i);
  const partitions = Array.from({ length: Math.max(0, spec.rooms - 1) }, (_, i) => i);

  return (
    <svg viewBox={`0 0 ${totalW} ${totalH}`} className="w-full h-auto bg-white border rounded-lg">
      {/* Title */}
      <text x={totalW / 2} y={20} textAnchor="middle" className="fill-foreground" fontSize="14" fontWeight="bold">
        Plan View — Cabin {spec.length}{spec.unit} × {spec.width}{spec.unit} × {spec.height}{spec.unit}
      </text>
      {/* Outline */}
      <rect x={padding} y={padding + 20} width={w} height={h} fill="hsl(var(--muted))" stroke="hsl(var(--primary))" strokeWidth="2" />

      {/* Partitions */}
      {partitions.map((i) => {
        const x = padding + (w * (i + 1)) / spec.rooms;
        return <line key={`p${i}`} x1={x} y1={padding + 20} x2={x} y2={padding + 20 + h} stroke="hsl(var(--primary))" strokeWidth="1.5" strokeDasharray="4 4" />;
      })}

      {/* Doors (bottom edge) */}
      {doors.map((i) => {
        const x = padding + (w * (i + 0.5)) / spec.doors;
        return (
          <g key={`d${i}`}>
            <rect x={x - 15} y={padding + 20 + h - 4} width={30} height={8} fill="hsl(var(--accent))" />
            <text x={x} y={padding + 20 + h + 18} textAnchor="middle" fontSize="10" className="fill-muted-foreground">D{i + 1}</text>
          </g>
        );
      })}

      {/* Windows (top edge) */}
      {windows.map((i) => {
        const x = padding + (w * (i + 0.5)) / spec.windows;
        return (
          <g key={`w${i}`}>
            <rect x={x - 18} y={padding + 16} width={36} height={8} fill="hsl(var(--primary) / 0.6)" />
            <text x={x} y={padding + 14} textAnchor="middle" fontSize="10" className="fill-muted-foreground">W{i + 1}</text>
          </g>
        );
      })}

      {/* Electrical symbols per room */}
      {Array.from({ length: spec.rooms }, (_, i) => {
        const cx = padding + (w * (i + 0.5)) / spec.rooms;
        const cy = padding + 20 + h / 2;
        return (
          <g key={`r${i}`}>
            <circle cx={cx} cy={cy} r="10" fill="none" stroke="hsl(var(--accent))" strokeWidth="1.5" />
            <text x={cx} y={cy + 3} textAnchor="middle" fontSize="9" className="fill-foreground" fontWeight="bold">F</text>
            <circle cx={cx - 30} cy={cy - 25} r="5" fill="hsl(var(--accent))" />
            <circle cx={cx + 30} cy={cy - 25} r="5" fill="hsl(var(--accent))" />
            <rect x={cx - 8} y={cy + 18} width={16} height={6} fill="hsl(var(--primary))" />
          </g>
        );
      })}

      {/* Dimension lines */}
      <line x1={padding} y1={padding + 20 + h + 30} x2={padding + w} y2={padding + 20 + h + 30} stroke="hsl(var(--foreground))" strokeWidth="0.8" markerStart="url(#arr)" markerEnd="url(#arr)" />
      <text x={padding + w / 2} y={padding + 20 + h + 26} textAnchor="middle" fontSize="11" className="fill-foreground">{spec.length}{spec.unit}</text>

      <line x1={padding - 15} y1={padding + 20} x2={padding - 15} y2={padding + 20 + h} stroke="hsl(var(--foreground))" strokeWidth="0.8" />
      <text x={padding - 22} y={padding + 20 + h / 2} textAnchor="middle" fontSize="11" transform={`rotate(-90 ${padding - 22} ${padding + 20 + h / 2})`} className="fill-foreground">{spec.width}{spec.unit}</text>

      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="hsl(var(--foreground))" />
        </marker>
      </defs>

      {/* Legend */}
      <g transform={`translate(${padding}, ${totalH - 8})`}>
        <text fontSize="9" className="fill-muted-foreground">F = Fan • ● = Light • ▭ = Socket • D = Door • W = Window</text>
      </g>
    </svg>
  );
}

// ============== Main Page ==============
export default function CabinQuotation() {
  const [spec, setSpec] = useState<Spec>(DEFAULT_SPEC);
  const [client, setClient] = useState({ name: "", company: "", phone: "", email: "", site: "" });
  const [quotationNumber, setQuotationNumber] = useState<string>("");
  const [bomOverride, setBomOverride] = useState<Record<string, Partial<BomItem>>>({});
  const [savedId, setSavedId] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const baseBom = useMemo(() => calcBOM(spec), [spec]);
  const bom = useMemo(
    () => baseBom.map(i => ({ ...i, ...bomOverride[i.key] })),
    [baseBom, bomOverride]
  );

  const totals = useMemo(() => {
    let subtotal = 0, gstTotal = 0;
    bom.forEach(i => {
      const amt = i.qty * i.rate;
      subtotal += amt;
      gstTotal += (amt * i.gst) / 100;
    });
    return { subtotal, gstTotal, grandTotal: subtotal + gstTotal };
  }, [bom]);

  const updateSpec = <K extends keyof Spec>(k: K, v: Spec[K]) => setSpec(s => ({ ...s, [k]: v }));
  const updateBom = (key: string, patch: Partial<BomItem>) =>
    setBomOverride(o => ({ ...o, [key]: { ...o[key], ...patch } }));

  const saveQuotation = async () => {
    const payload = {
      status: "draft",
      client_name: client.name,
      client_company: client.company,
      client_phone: client.phone,
      client_email: client.email,
      site_address: client.site,
      spec: spec as any,
      bom: bom as any,
      totals: totals as any,
    };
    const { data, error } = savedId
      ? await supabase.from("cabin_quotations").update(payload).eq("id", savedId).select().single()
      : await supabase.from("cabin_quotations").insert(payload).select().single();
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    setSavedId(data.id);
    setQuotationNumber(data.quotation_number);
    toast({ title: "Saved", description: `Quotation ${data.quotation_number} saved.` });
  };

  const exportPDF = async () => {
    if (!printRef.current) return;
    try {
      // Shared exporter. This also fixes a real bug in the old code: it scaled the WHOLE quotation
      // to a single addImage of height (canvas.height * 210 / canvas.width) with no pagination, so
      // anything taller than one A4 page simply ran off the bottom and was lost.
      const r = await exportSheetToPdf(printRef.current, {
        filename: quotationNumber || "Quotation",
        // `thead` is NOT a boundary — cutting at its bottom edge orphans the column headers at the
        // foot of a page and continues the rows, headerless, on the next one.
        breakSelector: "table, tbody > tr, h1, h2, h3",
      });
      toast({
        title: "Quotation PDF downloaded",
        description: `${r.pages} page${r.pages > 1 ? "s" : ""} · ${formatBytes(r.bytes)}`,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      toast({ title: "Could not generate PDF", description: msg ? msg.slice(0, 140) : "Please try again.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Calculator className="h-6 w-6 text-primary" /> Cabin Quotation Calculator</h2>
          <p className="text-sm text-muted-foreground">Enter dimensions — BOM, pricing & 2D plan auto-generate.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={saveQuotation}><Save className="h-4 w-4 mr-2" />Save</Button>
          <Button onClick={exportPDF}><Printer className="h-4 w-4 mr-2" />Export PDF</Button>
        </div>
      </div>

      <Tabs defaultValue="builder">
        <TabsList>
          <TabsTrigger value="builder">Builder</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Inputs */}
            <Card className="p-5 space-y-4">
              <h3 className="font-semibold text-lg">Cabin Specifications</h3>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Length"><NumberInput value={spec.length} onChange={(e) => updateSpec("length", +e.target.value)} /></Field>
                <Field label="Width"><NumberInput value={spec.width} onChange={(e) => updateSpec("width", +e.target.value)} /></Field>
                <Field label="Height"><NumberInput value={spec.height} onChange={(e) => updateSpec("height", +e.target.value)} /></Field>
                <Field label="Unit">
                  <Select value={spec.unit} onValueChange={(v: Unit) => updateSpec("unit", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="ft">Feet</SelectItem><SelectItem value="m">Meters</SelectItem></SelectContent>
                  </Select>
                </Field>
                <Field label="Doors"><NumberInput value={spec.doors} onChange={(e) => updateSpec("doors", +e.target.value)} /></Field>
                <Field label="Windows"><NumberInput value={spec.windows} onChange={(e) => updateSpec("windows", +e.target.value)} /></Field>
                <Field label="Rooms"><NumberInput value={spec.rooms} onChange={(e) => updateSpec("rooms", +e.target.value)} /></Field>
                <Field label="Heavy Pts (AC)"><NumberInput value={spec.heavyPoints} onChange={(e) => updateSpec("heavyPoints", +e.target.value)} /></Field>
                <Field label="Roof Type">
                  <Select value={spec.roofType} onValueChange={(v: RoofType) => updateSpec("roofType", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">Flat</SelectItem>
                      <SelectItem value="sloped">Sloped</SelectItem>
                      <SelectItem value="sheet">Sheet</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Wall Type">
                  <Select value={spec.wallType} onValueChange={(v: WallType) => updateSpec("wallType", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="brick">Brick</SelectItem>
                      <SelectItem value="sheet">Sheet</SelectItem>
                      <SelectItem value="sandwich">Sandwich Panel</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="border-t pt-4 space-y-3">
                <h4 className="font-medium text-sm">Client Details</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Name"><Input value={client.name} onChange={(e) => setClient({ ...client, name: e.target.value })} /></Field>
                  <Field label="Company"><Input value={client.company} onChange={(e) => setClient({ ...client, company: e.target.value })} /></Field>
                  <Field label="Phone"><Input value={client.phone} onChange={(e) => setClient({ ...client, phone: e.target.value })} /></Field>
                  <Field label="Email"><Input value={client.email} onChange={(e) => setClient({ ...client, email: e.target.value })} /></Field>
                </div>
                <Field label="Site Address"><Textarea rows={2} value={client.site} onChange={(e) => setClient({ ...client, site: e.target.value })} /></Field>
              </div>
            </Card>

            {/* Drawing */}
            <Card className="p-5">
              <h3 className="font-semibold text-lg mb-3">2D Floor Plan (Live)</h3>
              <FloorPlan spec={spec} />
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <Stat label="Floor Area" value={`${(spec.length * spec.width).toFixed(0)} sq${spec.unit}`} />
                <Stat label="Wall Area" value={`${(2 * (spec.length + spec.width) * spec.height).toFixed(0)} sq${spec.unit}`} />
                <Stat label="Items in BOM" value={`${bom.length}`} />
              </div>
            </Card>
          </div>

          {/* BOM */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg flex items-center gap-2"><FileText className="h-5 w-5" /> Bill of Materials</h3>
              <div className="text-sm text-muted-foreground">Grand Total: <span className="font-bold text-foreground">{formatINR(totals.grandTotal)}</span></div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="w-28">Qty</TableHead>
                    <TableHead className="w-28">Rate (₹)</TableHead>
                    <TableHead className="w-20">GST %</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bom.map((i) => {
                    const amt = i.qty * i.rate;
                    return (
                      <TableRow key={i.key}>
                        <TableCell className="text-xs text-muted-foreground">{i.category}</TableCell>
                        <TableCell className="font-medium">{i.name}</TableCell>
                        <TableCell>{i.unit}</TableCell>
                        <TableCell><NumberInput value={i.qty} onChange={(e) => updateBom(i.key, { qty: +e.target.value })} className="h-8" /></TableCell>
                        <TableCell><NumberInput value={i.rate} onChange={(e) => updateBom(i.key, { rate: +e.target.value })} className="h-8" /></TableCell>
                        <TableCell><NumberInput value={i.gst} onChange={(e) => updateBom(i.key, { gst: +e.target.value })} className="h-8" /></TableCell>
                        <TableCell className="text-right font-mono">{formatINR(amt)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 flex justify-end">
              <div className="w-72 space-y-1 text-sm">
                <Row label="Subtotal" value={formatINR(totals.subtotal)} />
                <Row label="GST" value={formatINR(totals.gstTotal)} />
                <Row label="Grand Total" value={formatINR(totals.grandTotal)} bold />
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="preview">
          <Card className="p-8 max-w-4xl mx-auto bg-white text-black">
            {/* `light` is LOAD-BEARING, not cosmetic. The app runs <html class="dark"> (and index.css
                binds the dark palette on :root too), and `bg-white`/`text-black` above are literal
                utilities — they do NOT re-bind the --foreground / --muted / --primary custom
                properties. So the plan-view SVG below, which paints with hsl(var(--…)) and
                fill-foreground, resolved against the DARK palette: a near-black --muted floor fill
                and near-WHITE dimension lines, text and arrowheads on white paper. That was wrong on
                screen and, because the PDF exporter faithfully flattens whatever palette is in scope,
                it was baked into the exported quotation too. `light` re-binds the tokens for this
                subtree — dark navy ink, pale floor, amber openings. (exportSheetToPdf also forces the
                light palette during capture, so the PDF is safe either way; this fixes the preview.) */}
            <div ref={printRef} className="light space-y-6">
              <div className="flex justify-between items-start border-b-2 border-primary pb-4">
                <div>
                  <h1 className="text-2xl font-bold text-primary">Portable Office Cabin</h1>
                  <p className="text-xs text-gray-600">India's Trusted Portable Cabin Manufacturer</p>
                </div>
                <div className="text-right text-xs">
                  <p className="font-bold text-lg">QUOTATION</p>
                  <p>{quotationNumber || "DRAFT"}</p>
                  <p>{new Date().toLocaleDateString("en-IN")}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold text-gray-500 text-xs uppercase mb-1">Bill To</p>
                  <p className="font-bold">{client.name || "—"}</p>
                  <p>{client.company}</p>
                  <p>{client.phone} • {client.email}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-500 text-xs uppercase mb-1">Site</p>
                  <p>{client.site || "—"}</p>
                </div>
              </div>

              <div className="border rounded p-3 text-sm bg-gray-50">
                <p className="font-semibold mb-1">Cabin Specifications</p>
                <p>{spec.length} × {spec.width} × {spec.height} {spec.unit} • {spec.rooms} room(s) • {spec.doors} door(s) • {spec.windows} window(s) • {spec.wallType} walls • {spec.roofType} roof</p>
              </div>

              <div className="bg-white p-2 border rounded">
                <FloorPlan spec={spec} />
              </div>

              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-primary text-white">
                    <th className="p-2 text-left">#</th>
                    <th className="p-2 text-left">Item</th>
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2 text-center">Unit</th>
                    <th className="p-2 text-right">Rate</th>
                    <th className="p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {bom.map((i, idx) => (
                    <tr key={i.key} className="border-b">
                      <td className="p-2">{idx + 1}</td>
                      <td className="p-2">{i.name}</td>
                      <td className="p-2 text-center">{i.qty}</td>
                      <td className="p-2 text-center">{i.unit}</td>
                      <td className="p-2 text-right">{formatINR(i.rate)}</td>
                      <td className="p-2 text-right">{formatINR(i.qty * i.rate)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td colSpan={5} className="p-2 text-right font-medium">Subtotal</td><td className="p-2 text-right">{formatINR(totals.subtotal)}</td></tr>
                  <tr><td colSpan={5} className="p-2 text-right font-medium">GST</td><td className="p-2 text-right">{formatINR(totals.gstTotal)}</td></tr>
                  <tr className="bg-gray-100 font-bold"><td colSpan={5} className="p-2 text-right">Grand Total</td><td className="p-2 text-right">{formatINR(totals.grandTotal)}</td></tr>
                </tfoot>
              </table>

              <div className="text-xs text-gray-600 border-t pt-3">
                <p className="font-semibold mb-1">Terms & Conditions</p>
                <p>• Prices exclusive of transportation & installation. • Validity: 15 days. • 50% advance, balance before dispatch. • No returns on custom orders.</p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-xs">{label}</Label>
    {children}
  </div>
);
const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-muted rounded p-2">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="font-bold">{value}</p>
  </div>
);
const Row = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
  <div className={`flex justify-between ${bold ? "font-bold text-base border-t pt-2" : ""}`}>
    <span>{label}</span><span>{value}</span>
  </div>
);
