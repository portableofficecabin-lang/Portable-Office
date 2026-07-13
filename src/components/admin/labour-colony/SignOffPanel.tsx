"use client";

import { PenLine, RotateCcw, Check, Users, MonitorSmartphone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SignOffDetails, SignOffSource } from "./signOff";

/**
 * The editor for the drawing's sign-off strip.
 *
 * The four NAMES are shared: they are stored once in Supabase and pre-fill the strip for every
 * authorised login on every device. The DATE is per-drawing and defaults to today.
 *
 * This panel is a CONTROL, not part of the drawing — it lives OUTSIDE the sheet's ref, so it never
 * appears in window.print() or in the exported PDF; only the values it produces are printed.
 *
 * There is deliberately no signature or stamp input. See the header of ./signOff.ts.
 */

const FIELDS: {
  key: keyof SignOffDetails;
  label: string;
  placeholder: string;
  hint?: string;
}[] = [
  { key: "designedBy", label: "Designed by", placeholder: "Name" },
  { key: "checkedBy", label: "Checked by", placeholder: "Name" },
  {
    key: "engineerName",
    label: "Structural Engineer",
    placeholder: "Full name",
    hint: "Their real name — leave blank until you have one",
  },
  { key: "engineerLicence", label: "Licence / Reg. no.", placeholder: "e.g. CE/12345", hint: "Their real licence number" },
  { key: "date", label: "Date", placeholder: "DD / MM / YYYY", hint: "This drawing only — not shared" },
];

/**
 * Says exactly where the names ended up. "Saved for team" is only ever shown when the Supabase write
 * actually succeeded — if it fell back to this device, it must say so, or someone will believe their
 * engineer's name is shared with the team when it is not.
 */
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
}: {
  value: SignOffDetails;
  onChange: (next: SignOffDetails) => void;
  onReset: () => void;
  source: SignOffSource;
  saving: boolean;
}) {
  const set = (key: keyof SignOffDetails, v: string) => onChange({ ...value, [key]: v });

  return (
    <div className="rounded-xl border border-input bg-muted/30 p-3">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PenLine className="h-4 w-4 text-amber" />
          <span className="text-xs font-bold uppercase tracking-wide">Sign-off details</span>
          <span className="text-[11px] text-muted-foreground">
            Shared with your team — typed once, printed on every drawing set
          </span>
        </div>
        <div className="flex items-center gap-2">
          <SyncBadge source={source} saving={saving} />
          <Button variant="ghost" size="sm" onClick={onReset} className="h-7 gap-1.5 text-xs">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {FIELDS.map((f) => (
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
        These names are printed onto the sign-off strip so it does not have to be filled in by hand.
        They do <b>not</b> approve the drawing: the <b>Signature &amp; stamp</b> box stays empty, and the
        sheet remains <b className="text-red-600">NOT FOR CONSTRUCTION</b> until a qualified structural
        engineer physically signs and stamps it.
      </p>
    </div>
  );
}
