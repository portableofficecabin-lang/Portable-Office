"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, FileDown, Copy, FileText, RefreshCw, Pencil } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { addLegalFooter } from "@/lib/pdfFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logoUrl from "@/assets/logo.webp";
import signatureSealUrl from "@/assets/signature-seal.webp";

type SpecRow = { id: string; label: string; value: string };
type SpecSection = { id: string; title: string; rows: SpecRow[] };

type SavedSpec = {
  id: string;
  client_name: string | null;
  project_details: string | null;
  doc_date: string | null;
  ref_number: string | null;
  sections: SpecSection[];
  created_at: string;
};

const uid = () => Math.random().toString(36).slice(2, 9);

const DEFAULT_SECTIONS: SpecSection[] = [
  {
    id: uid(),
    title: "General Details",
    rows: [
      { id: uid(), label: "Cabin Type", value: "" },
      { id: uid(), label: "Overall Size (L x W x H)", value: "" },
      { id: uid(), label: "Application", value: "" },
      { id: uid(), label: "Quantity", value: "" },
    ],
  },
  {
    id: uid(),
    title: "Structural Framework",
    rows: [
      { id: uid(), label: "Main Frame", value: "MS Hollow Section / ISMC Channel" },
      { id: uid(), label: "Frame Thickness", value: "" },
      { id: uid(), label: "Anti-Corrosion Treatment", value: "Red Oxide Primer + Enamel Paint" },
    ],
  },
  {
    id: uid(),
    title: "Wall Construction",
    rows: [
      { id: uid(), label: "Outer Wall", value: "GI / PPGI Pre-coated Sheet (0.50 mm)" },
      { id: uid(), label: "Inner Wall", value: "GI Sheet / PVC Panel" },
      { id: uid(), label: "Insulation Core", value: "PUF / Rockwool / Thermocol" },
      { id: uid(), label: "Total Wall Thickness", value: "50 mm / 75 mm" },
    ],
  },
];

// Brand colors (RGB)
const BRAND_DARK: [number, number, number] = [62, 47, 47];
const BRAND_OLIVE: [number, number, number] = [124, 126, 90];
const TEXT_GRAY: [number, number, number] = [68, 68, 68];
const LINE_GRAY: [number, number, number] = [154, 154, 138];
const ROW_LABEL_BG: [number, number, number] = [245, 244, 238];

async function loadImageAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function AdminSpecifications() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [projectDetails, setProjectDetails] = useState("");
  const [docDate, setDocDate] = useState(new Date().toISOString().slice(0, 10));
  const [refNumber, setRefNumber] = useState("");
  const [sections, setSections] = useState<SpecSection[]>(DEFAULT_SECTIONS);
  const [generating, setGenerating] = useState(false);
  const [savedSpecs, setSavedSpecs] = useState<SavedSpec[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

  const fetchSaved = useCallback(async () => {
    try {
      setLoadingSaved(true);
      const { data, error } = await supabase
        .from("spec_documents")
        .select("id, client_name, project_details, doc_date, ref_number, sections, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setSavedSpecs((data || []) as unknown as SavedSpec[]);
    } catch (err) {
      console.error(err);
      toast({
        title: "Failed to load saved specifications",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoadingSaved(false);
    }
  }, []);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  const resetForm = () => {
    setEditingId(null);
    setClientName("");
    setProjectDetails("");
    setDocDate(new Date().toISOString().slice(0, 10));
    setRefNumber("");
    setSections(
      DEFAULT_SECTIONS.map((s) => ({
        ...s,
        id: uid(),
        rows: s.rows.map((r) => ({ ...r, id: uid() })),
      })),
    );
  };

  const loadSaved = (s: SavedSpec) => {
    setEditingId(s.id);
    setClientName(s.client_name || "");
    setProjectDetails(s.project_details || "");
    setDocDate(s.doc_date || new Date().toISOString().slice(0, 10));
    setRefNumber(s.ref_number || "");
    const restored = (Array.isArray(s.sections) ? s.sections : []).map((sec) => ({
      id: sec.id || uid(),
      title: sec.title || "",
      rows: (sec.rows || []).map((r) => ({
        id: r.id || uid(),
        label: r.label || "",
        value: r.value || "",
      })),
    }));
    setSections(restored.length > 0 ? restored : DEFAULT_SECTIONS);
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast({ title: "Loaded", description: "Specification loaded for editing." });
  };

  const deleteSaved = async (id: string) => {
    if (!confirm("Delete this specification record? This cannot be undone.")) return;
    try {
      const { error } = await supabase.from("spec_documents").delete().eq("id", id);
      if (error) throw error;
      setSavedSpecs((prev) => prev.filter((s) => s.id !== id));
      if (editingId === id) resetForm();
      toast({ title: "Deleted", description: "Specification record removed." });
    } catch (err) {
      console.error(err);
      toast({
        title: "Failed to delete",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  // ---- Section + row mutations ----
  const addSection = () => {
    setSections((prev) => [
      ...prev,
      { id: uid(), title: "New Section", rows: [{ id: uid(), label: "", value: "" }] },
    ]);
  };

  const removeSection = (sid: string) => {
    setSections((prev) => prev.filter((s) => s.id !== sid));
  };

  const duplicateSection = (sid: string) => {
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.id === sid);
      if (idx < 0) return prev;
      const original = prev[idx];
      const copy: SpecSection = {
        id: uid(),
        title: original.title + " (Copy)",
        rows: original.rows.map((r) => ({ ...r, id: uid() })),
      };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  };

  const updateSectionTitle = (sid: string, title: string) => {
    setSections((prev) => prev.map((s) => (s.id === sid ? { ...s, title } : s)));
  };

  const addRow = (sid: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sid ? { ...s, rows: [...s.rows, { id: uid(), label: "", value: "" }] } : s,
      ),
    );
  };

  const removeRow = (sid: string, rid: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sid ? { ...s, rows: s.rows.filter((r) => r.id !== rid) } : s)),
    );
  };

  const updateRow = (sid: string, rid: string, field: "label" | "value", val: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sid
          ? { ...s, rows: s.rows.map((r) => (r.id === rid ? { ...r, [field]: val } : r)) }
          : s,
      ),
    );
  };

  const moveSection = (sid: string, dir: -1 | 1) => {
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.id === sid);
      const ni = idx + dir;
      if (idx < 0 || ni < 0 || ni >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[ni]] = [next[ni], next[idx]];
      return next;
    });
  };

  // ---- PDF generation ----
  const generatePdf = async () => {
    try {
      setGenerating(true);
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const marginL = 18;
      const marginR = 18;
      const marginB = 15;
      const contentW = pageW - marginL - marginR;

      const logoData = await loadImageAsDataUrl(logoUrl);

      const drawHeader = () => {
        // Logo top-left, sized & positioned to vertically align with header text block (y ~18 to y ~40)
        const logoSize = 22;
        const logoX = marginL;
        const logoY = 18;
        try {
          doc.addImage(logoData, "JPEG", logoX, logoY, logoSize, logoSize);
        } catch {
          // ignore
        }
        // Company name centered
        doc.setTextColor(...BRAND_DARK);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        doc.text("PORTABLE OFFICE CABIN", pageW / 2, 22, { align: "center" });

        // Olive accents under name
        doc.setDrawColor(...BRAND_OLIVE);
        doc.setLineWidth(0.4);
        doc.line(pageW / 2 - 35, 25, pageW / 2 - 5, 25);
        doc.line(pageW / 2 + 5, 25, pageW / 2 + 35, 25);

        // Address
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...TEXT_GRAY);
        doc.text(
          "Door No. 2/149-6, Survey No. 222/1C, Addakurukki Village, Kamandoddi Post,",
          pageW / 2,
          30,
          { align: "center" },
        );
        doc.text("Shoolagiri, Krishnagiri, Tamil Nadu – 635117", pageW / 2, 34, { align: "center" });

        // Contact line
        doc.setTextColor(...BRAND_DARK);
        doc.text(
          "Phone: 9019910931 / 9731897976  |  Website: portableofficecabin.com  |  GST No: 33FVKPK6238Q1ZT",
          pageW / 2,
          39,
          { align: "center" },
        );

        // Header rules
        doc.setDrawColor(...BRAND_DARK);
        doc.setLineWidth(0.5);
        doc.line(marginL, 43, pageW - marginR, 43);
        doc.setDrawColor(...BRAND_OLIVE);
        doc.setLineWidth(0.2);
        doc.line(marginL, 44, pageW - marginR, 44);
      };

      const drawFooter = (pageNum: number, total: number) => {
        const y = marginB + 8;
        doc.setDrawColor(...BRAND_DARK);
        doc.setLineWidth(0.4);
        doc.line(marginL, y, pageW - marginR, y);
        doc.setDrawColor(...BRAND_OLIVE);
        doc.setLineWidth(0.2);
        doc.line(marginL, y + 1, pageW - marginR, y + 1);

        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(...TEXT_GRAY);
        doc.text(
          "Portable Office Cabin  •  Premium Portable Cabins & Prefab Solutions",
          marginL,
          marginB + 13,
        );
        doc.text(`Page ${pageNum} of ${total}`, pageW - marginR, marginB + 13, { align: "right" });
      };

      drawHeader();

      // Title
      let y = 53;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(...BRAND_DARK);
      doc.text("TECHNICAL SPECIFICATION", pageW / 2, y, { align: "center" });
      doc.setDrawColor(...BRAND_OLIVE);
      doc.setLineWidth(0.6);
      doc.line(pageW / 2 - 25, y + 1.5, pageW / 2 + 25, y + 1.5);
      y += 10;

      // Info block (Client / Project / Date / Ref)
      const info: [string, string][] = [
        ["Client Name", clientName || ""],
        ["Project Details", projectDetails || ""],
        ["Date", docDate || ""],
        ["Reference No.", refNumber || ""],
      ];

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...BRAND_DARK);
      info.forEach(([k, v]) => {
        doc.setFont("helvetica", "bold");
        doc.text(k, marginL, y + 5);
        doc.text(":", marginL + 38, y + 5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...TEXT_GRAY);
        const lines = doc.splitTextToSize(v || "", contentW - 45);
        doc.text(lines, marginL + 42, y + 5);
        // Underline
        doc.setDrawColor(...LINE_GRAY);
        doc.setLineWidth(0.2);
        doc.line(marginL + 42, y + 6.5, pageW - marginR, y + 6.5);
        doc.setTextColor(...BRAND_DARK);
        y += 8;
      });

      y += 4;

      // Sections as autoTables with section header + body
      sections.forEach((section, sIdx) => {
        const numberedTitle = `${sIdx + 1}. ${section.title || "Untitled Section"}`;
        const body = section.rows
          .filter((r) => (r.label || "").trim() !== "" || (r.value || "").trim() !== "")
          .map((r) => [r.label || "", r.value || ""]);

        if (body.length === 0) return;

        autoTable(doc, {
          startY: y,
          head: [[{ content: numberedTitle, colSpan: 2 }]],
          body,
          theme: "grid",
          margin: { left: marginL, right: marginR, bottom: marginB + 15, top: 48 },
          styles: {
            font: "helvetica",
            fontSize: 9.5,
            textColor: TEXT_GRAY,
            lineColor: LINE_GRAY,
            lineWidth: 0.15,
            cellPadding: { top: 2, right: 3, bottom: 2, left: 3 },
            valign: "middle",
          },
          headStyles: {
            fillColor: BRAND_DARK,
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 11,
            cellPadding: { top: 2.5, right: 3, bottom: 2.5, left: 3 },
          },
          columnStyles: {
            0: {
              cellWidth: 60,
              fillColor: ROW_LABEL_BG,
              textColor: BRAND_DARK,
              fontStyle: "normal",
            },
            1: { cellWidth: contentW - 60 },
          },
          didDrawPage: () => {
            // Re-draw header on new pages (autotable already respected top margin)
            // We want header on every page. autoTable triggers didDrawPage for each.
            drawHeader();
          },
        });

        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3;
      });

      // Signatory block (with official signature & seal image)
      const sigNeeded = 60;
      if (y + sigNeeded > pageH - marginB - 12) {
        doc.addPage();
        drawHeader();
        y = 50;
      }

      y += 3;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(...TEXT_GRAY);
      doc.text(
        "Note: All specifications are indicative and may be customized as per client requirements.",
        marginL,
        y,
      );
      y += 8;

      // Load and embed signature/seal image (right-aligned)
      const rightX = pageW - marginR;
      try {
        const sigData = await loadImageAsDataUrl(signatureSealUrl);
        const sigW = 55; // mm
        const sigH = 32; // mm
        const sigX = rightX - sigW;
        doc.addImage(sigData, "PNG", sigX, y, sigW, sigH);
        y += sigH + 1;
      } catch {
        // If image fails to load, fall back to text-only block
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...BRAND_DARK);
        doc.text("For PORTABLE OFFICE CABIN", rightX, y, { align: "right" });
        y += 18;
      }

      // Signature line + labels under the seal
      doc.setDrawColor(...BRAND_DARK);
      doc.setLineWidth(0.3);
      doc.line(rightX - 60, y, rightX, y);
      y += 4;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...BRAND_DARK);
      doc.text("Authorized Signatory", rightX, y, { align: "right" });
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...TEXT_GRAY);
      doc.text("Proprietor — Portable Office Cabin", rightX, y, { align: "right" });
      y += 4;
      doc.text("(Digitally signed & sealed)", rightX, y, { align: "right" });

      // Footers on every page
      const totalPages = doc.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        drawFooter(p, totalPages);
      }

      const safeClient = (clientName || "Client").replace(/[^a-z0-9]+/gi, "_").slice(0, 40);
      addLegalFooter(doc);
      doc.save(`Technical_Specification_${safeClient}_${docDate}.pdf`);

      // Persist record to database (insert new or update existing)
      try {
        const payload = {
          client_name: clientName || null,
          project_details: projectDetails || null,
          doc_date: docDate || null,
          ref_number: refNumber || null,
          sections: JSON.parse(JSON.stringify(sections)),
        };
        if (editingId) {
          const { error: updErr } = await supabase
            .from("spec_documents")
            .update(payload)
            .eq("id", editingId);
          if (updErr) throw updErr;
        } else {
          const { data: userData } = await supabase.auth.getUser();
          const { data: inserted, error: insErr } = await supabase
            .from("spec_documents")
            .insert([{ ...payload, created_by: userData.user?.id ?? null }])
            .select("id")
            .single();
          if (insErr) throw insErr;
          if (inserted?.id) setEditingId(inserted.id);
        }
        await fetchSaved();
      } catch (saveErr) {
        console.error("Save record failed", saveErr);
        toast({
          title: "PDF downloaded, but record not saved",
          description: saveErr instanceof Error ? saveErr.message : "Unknown error",
          variant: "destructive",
        });
      }

      toast({
        title: "PDF generated",
        description: "Your technical specification has been downloaded and recorded.",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Failed to generate PDF",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-6xl mx-auto"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">
            Technical Specification Builder
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {editingId
              ? "Editing a saved specification — saving will update the existing record."
              : "Create your own specification document with custom sections (2-column: Label and Value), then export as a print-ready PDF on company letterhead."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {editingId && (
            <Button onClick={resetForm} variant="outline" size="lg" className="rounded-xl">
              <Plus className="h-4 w-4 mr-2" />
              New Spec
            </Button>
          )}
          <Button
            onClick={generatePdf}
            disabled={generating}
            size="lg"
            className="rounded-xl"
          >
            <FileDown className="h-4 w-4 mr-2" />
            {generating ? "Saving..." : editingId ? "Save & Download PDF" : "Download PDF"}
          </Button>
        </div>
      </div>

      {/* Document meta */}
      <Card className="p-6">
        <h3 className="font-semibold text-foreground mb-4">Document Details</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="client">Client Name</Label>
            <Input
              id="client"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. ABC Constructions Pvt Ltd"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project">Project Details</Label>
            <Input
              id="project"
              value={projectDetails}
              onChange={(e) => setProjectDetails(e.target.value)}
              placeholder="e.g. Site office for highway project, Krishnagiri"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ref">Reference No.</Label>
            <Input
              id="ref"
              value={refNumber}
              onChange={(e) => setRefNumber(e.target.value)}
              placeholder="e.g. POC/2026/001"
            />
          </div>
        </div>
      </Card>

      {/* Sections */}
      <div className="space-y-5">
        {sections.map((section, sIdx) => (
          <Card key={section.id} className="p-5">
            {/* Section header */}
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => moveSection(section.id, -1)}
                  disabled={sIdx === 0}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs leading-none"
                  title="Move up"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => moveSection(section.id, 1)}
                  disabled={sIdx === sections.length - 1}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs leading-none mt-1"
                  title="Move down"
                >
                  ▼
                </button>
              </div>
              <div className="text-sm font-bold text-muted-foreground w-6 shrink-0">
                {sIdx + 1}.
              </div>
              <Input
                value={section.title}
                onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                placeholder="Section title (e.g. Electrical Works)"
                className="font-semibold text-base"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => duplicateSection(section.id)}
                title="Duplicate section"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeSection(section.id)}
                title="Remove section"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Rows: 2-column layout */}
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_1.5fr_auto] gap-3 px-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <div>Label (Column 1)</div>
                <div>Value (Column 2)</div>
                <div className="w-8" />
              </div>
              {section.rows.map((row) => (
                <div key={row.id} className="grid grid-cols-[1fr_1.5fr_auto] gap-3 items-start">
                  <Input
                    value={row.label}
                    onChange={(e) => updateRow(section.id, row.id, "label", e.target.value)}
                    placeholder="e.g. Outer Wall"
                  />
                  <Input
                    value={row.value}
                    onChange={(e) => updateRow(section.id, row.id, "value", e.target.value)}
                    placeholder="e.g. GI / PPGI Pre-coated Sheet (0.50 mm)"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(section.id, row.id)}
                    title="Remove row"
                    className="text-destructive hover:text-destructive shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => addRow(section.id)}
                className="mt-2 rounded-lg"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Row
              </Button>
            </div>
          </Card>
        ))}

        <Button onClick={addSection} variant="outline" className="w-full rounded-xl h-12">
          <Plus className="h-4 w-4 mr-2" />
          Add New Section
        </Button>
      </div>

      {/* Bottom actions */}
      <div className="flex justify-end pt-2">
        <Button onClick={generatePdf} disabled={generating} size="lg" className="rounded-xl">
          <FileDown className="h-4 w-4 mr-2" />
          {generating ? "Generating PDF..." : "Download PDF"}
        </Button>
      </div>

      {/* Tip */}
      <div className="text-xs text-muted-foreground bg-muted/40 border border-border rounded-xl p-4">
        <strong className="text-foreground">Tip:</strong> Empty rows are skipped automatically. Each
        time you click "Download PDF", the specification is also recorded below and stays until you
        delete it.
      </div>

      {/* Saved Specifications */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-foreground" />
            <h3 className="font-semibold text-foreground">
              Saved Specifications{" "}
              <span className="text-muted-foreground font-normal">({savedSpecs.length})</span>
            </h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSaved}
            disabled={loadingSaved}
            className="rounded-lg"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loadingSaved ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {loadingSaved && savedSpecs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
        ) : savedSpecs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No saved specifications yet. Generate a PDF to record one here.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                  <th className="px-2 py-2">Date</th>
                  <th className="px-2 py-2">Client</th>
                  <th className="px-2 py-2">Project</th>
                  <th className="px-2 py-2">Ref. No.</th>
                  <th className="px-2 py-2 text-center">Sections</th>
                  <th className="px-2 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {savedSpecs.map((s) => {
                  const isEditing = editingId === s.id;
                  const sectionCount = Array.isArray(s.sections) ? s.sections.length : 0;
                  return (
                    <tr
                      key={s.id}
                      className={`border-b border-border last:border-0 ${
                        isEditing ? "bg-muted/40" : ""
                      }`}
                    >
                      <td className="px-2 py-3 whitespace-nowrap text-muted-foreground">
                        {s.doc_date || new Date(s.created_at).toISOString().slice(0, 10)}
                      </td>
                      <td className="px-2 py-3 font-medium text-foreground">
                        {s.client_name || "—"}
                        {isEditing && (
                          <span className="ml-2 text-[10px] uppercase tracking-wide text-primary">
                            Editing
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-muted-foreground max-w-[260px] truncate">
                        {s.project_details || "—"}
                      </td>
                      <td className="px-2 py-3 text-muted-foreground whitespace-nowrap">
                        {s.ref_number || "—"}
                      </td>
                      <td className="px-2 py-3 text-center text-muted-foreground">
                        {sectionCount}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => loadSaved(s)}
                            title="Load & edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteSaved(s.id)}
                            title="Delete record"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
