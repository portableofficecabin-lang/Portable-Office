"use client";

import { PenLine, RotateCcw, Users, MonitorSmartphone, Loader2, Stamp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DRAWING_STATUSES, statusMeta,
  type DrawingStatus, type RevisionInfo, type SignOffDetails, type SignOffSource,
} from "./signOff";

/**
 * The editor for the drawing's approval status, revision block and sign-off strip.
 *
 * The NAMES are shared (Supabase) / cached locally; the DATE is per-drawing and defaults to today;
 * the STATUS + REVISION block is per-issue (cached on this device so a refresh keeps it).
 *
 * This panel is a CONTROL, not part of the drawing — it lives OUTSIDE the sheet's ref, so it never
 * appears in window.print() or the exported PDF; only the values it produces are printed.
 *
 * There is deliberately no signature or stamp input. See the header of ./signOff.ts.
 */

const NAME_FIELDS: {
  key: keyof SignOffDetails;
  label: string;
  placeholder: string;
  hint?: string;
}[] = [
  { key: "designedBy", label: "Drawn by", placeholder: "Name" },
  { key: "checkedBy", label: "Checked by", placeholder: "Name" },
  { key: "approvedBy", label: "Approved by", placeholder: "Name" },
  { key: "approvedByDesignation", label: "Designation", placeholder: "e.g. Project Manager" },
  {
    key: "engineerName",
    label: "Structural Engineer",
    placeholder: "Full name",
    hint: "Their real name — leave blank until you have one",
  },
  { key: "engineerLicence", label: "Licence / Reg. no.", placeholder: "e.g. CE/12345", hint: "Their real licence number" },
  { key: "date", label: "Date", placeholder: "DD / MM / YYYY", hint: "This drawing only — not shared" },
];

function SyncBadge({ source, saving }: { source: SignOffSource; saving: boolean }) {
  if (saving) {
    return (
      <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
      </span>
    );
  }
  if (source === "team") {
    return (
      <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-700">
        <Users className="h-3.5 w-3.5" /> Saved for team
      </span>
    );
  }
  if (source === "local") {
    return (
      <span
        className="flex items-center gap-1 text-[11px] font-medium text-amber-700"
        title="Could not reach the shared settings. These names are saved on this device only and other team members will not see them."
      >
        <MonitorSmartphone className="h-3.5 w-3.5" /> This device only
      </span>
    );
  }
  return null;
}

export function SignOffPanel({
  value,
  onChange,
  onReset,
  source,
  saving,
  revision,
  onRevisionChange,
}: {
  value: SignOffDetails;
  onChange: (next: SignOffDetails) => void;
  onReset: () => void;
  source: SignOffSource;
  saving: boolean;
  revision: RevisionInfo;
  onRevisionChange: (next: RevisionInfo) => void;
}) {
  const set = (key: keyof SignOffDetails, v: string) => onChange({ ...value, [key]: v });
  const setRev = (patch: Partial<RevisionInfo>) => onRevisionChange({ ...revision, ...patch });
  const m = statusMeta(revision.status);

  return (
    <div className="rounded-xl border border-input bg-muted/30 p-3">
      {/* ---------- approval status + revision control ---------- */}
      <div className="mb-3 rounded-lg border bg-background p-3" style={{ borderColor: m.color }}>
        <div className="mb-2 flex items-center gap-2">
          <Stamp className="h-4 w-4" style={{ color: m.color }} />
          <span className="text-xs font-bold uppercase tracking-wide">Approval status &amp; revision</span>
          <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ background: m.colorSoft, color: m.color, border: `1px solid ${m.color}` }}>
            {m.watermark}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-[11px] font-semibold">Drawing status</Label>
            <Select value={revision.status} onValueChange={(v) => setRev({ status: v as DrawingStatus })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DRAWING_STATUSES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] leading-tight text-muted-foreground">Sets the watermark &amp; stamp on the sheet</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="rev-no" className="text-[11px] font-semibold">Revision no.</Label>
            <Input id="rev-no" value={revision.revNo} onChange={(e) => setRev({ revNo: e.target.value })}
              placeholder="R0" className="h-8 text-xs" autoComplete="off" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="rev-date" className="text-[11px] font-semibold">Revision date</Label>
            <Input id="rev-date" value={revision.revDate} onChange={(e) => setRev({ revDate: e.target.value })}
              placeholder="DD / MM / YYYY" className="h-8 text-xs" autoComplete="off" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="rev-desc" className="text-[11px] font-semibold">Revision description</Label>
            <Input id="rev-desc" value={revision.revDescription} onChange={(e) => setRev({ revDescription: e.target.value })}
              placeholder="e.g. Rooms increased to 16; plinth beam revised" className="h-8 text-xs" autoComplete="off" />
          </div>
          <div className="space-y-1 sm:col-span-2 lg:col-span-4">
            <Label htmlFor="rev-remarks" className="text-[11px] font-semibold">Remarks</Label>
            <Input id="rev-remarks" value={revision.remarks} onChange={(e) => setRev({ remarks: e.target.value })}
              placeholder="Printed on the stamp — e.g. approval conditions, site notes" className="h-8 text-xs" autoComplete="off" />
          </div>
        </div>
      </div>

      {/* ---------- names ---------- */}
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PenLine className="h-4 w-4 text-amber" />
          <span className="text-xs font-bold uppercase tracking-wide">Sign-off details</span>
          <span className="text-[11px] text-muted-foreground">
            Typed once, printed on every drawing set
          </span>
        </div>
        <div className="flex items-center gap-2">
          <SyncBadge source={source} saving={saving} />
          <Button variant="ghost" size="sm" onClick={onReset} className="h-7 gap-1.5 text-xs">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {NAME_FIELDS.map((f) => (
          <div key={f.key} className="space-y-1">
            <Label htmlFor={`signoff-${f.key}`} className="text-[11px] font-semibold">
              {f.label}
            </Label>
            <Input
              id={`signoff-${f.key}`}
              value={value[f.key]}
              onChange={(e) => set(f.key, e.target.value)}
              placeholder={f.placeholder}
              className="h-8 text-xs"
              autoComplete="off"
            />
            {f.hint && <p className="text-[10px] leading-tight text-muted-foreground">{f.hint}</p>}
          </div>
        ))}
      </div>

      {source === "local" && (
        <p className="mt-2.5 rounded-md border border-amber-300 bg-amber-50 px-2 py-1.5 text-[11px] leading-snug text-amber-900">
          <b>Not shared.</b> The team settings could not be reached, so these names are saved on this
          device only — other logins will not see them. They will sync the next time this page loads
          with a connection.
        </p>
      )}

      <p className="mt-2.5 text-[11px] leading-snug text-muted-foreground">
        These values print onto the stamp and sign-off strip so nothing is hand-written on every set.
        Typing a name approves nothing by itself: the <b>Signature &amp; stamp</b> box stays empty for a
        real signature, and the selected status — currently{" "}
        <b style={{ color: m.color }}>{m.watermark}</b> — is what the sheet and its watermark declare.
      </p>
    </div>
  );
}
