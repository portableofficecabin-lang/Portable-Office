"use client";

/**
 * The Cabin calculator's Material BOQ tab.
 *
 * WHY THIS WRAPPER EXISTS: CabinCalculator is a PUBLIC component (it renders on the homepage) and only
 * turns the BOQ on behind its `adminTools` flag. If it derived the take-off itself it would have to
 * import cabinTakeoff.ts statically, and the whole BOQ engine would ship to every homepage visitor.
 * Keeping the derivation here — behind one next/dynamic boundary — means the public bundle contains
 * none of it.
 *
 * LIVE RECALCULATION (spec §7): `config` is the SAME object the 2D plan, the four elevations and the
 * roof drawing render from, so the BOQ cannot drift from the drawing and the admin never re-enters a
 * dimension. The memo depends on the WHOLE config rather than a hand-picked field list — that is
 * deliberate. A partial dependency array here would silently serve a stale BOQ after (say) a door was
 * moved to another wall, and a stale BOQ is more dangerous than no BOQ. `config` is replaced
 * immutably on every edit, so this re-runs on any change and on nothing else.
 */

import { useMemo } from "react";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { buildCabinTakeoff } from "@/lib/boq/cabinTakeoff";
import { companyDefaultSettingsSync } from "@/lib/boq/templateStore";
import {
  DEFAULT_ROOF_RISE_FT,
  roofRiseFtOf,
  type BoqResult,
  type BoqSettings,
  type BoqTemplateKind,
  type CabinBoqOptions,
} from "@/lib/boq/types";
import type { CabinConfig } from "@/components/home/cabin-calculator/pricing";

import BoqPanel from "./BoqPanel";
import { DimField } from "./DimField";

const VERANDA_SIDES = ["front", "rear", "left", "right"] as const;

/** A PUF cabin must price PUF panels, a container must price a container — follow the wizard. */
function templateKindOf(cfg: CabinConfig): BoqTemplateKind {
  if (cfg.structureId === "puf") return "puf_cabin";
  if (cfg.structureId === "container") return "container";
  return "ms_cabin";
}

export interface CabinBoqPanelProps {
  config: CabinConfig;
  title: string;
  onSettingsChange: (s: BoqSettings) => void;
  onOptionsChange: (o: CabinBoqOptions) => void;
  onResult?: (r: BoqResult) => void;
}

export default function CabinBoqPanel({
  config,
  title,
  onSettingsChange,
  onOptionsChange,
  onResult,
}: CabinBoqPanelProps) {
  const kind = templateKindOf(config);
  // A NEW cabin (no saved boq settings yet) auto-applies the company construction preset — the admin's
  // chosen default if set, else the built-in Company Standard. `??` fires ONLY when config.boq is
  // absent, so a saved quotation's own settings/overrides are never overwritten. (spec §1)
  const settings = useMemo(() => config.boq ?? companyDefaultSettingsSync(kind), [config.boq, kind]);
  const opts = useMemo<CabinBoqOptions>(() => config.boqOptions ?? {}, [config.boqOptions]);

  const takeoff = useMemo(
    () => buildCabinTakeoff(config, settings.norms, opts),
    [config, settings.norms, opts],
  );

  const floors = opts.floors ?? 1;
  const verandaWidth = opts.verandaWidthFt ?? 0;
  const sides = opts.verandaSides ?? [];
  const patch = (p: Partial<CabinBoqOptions>) => onOptionsChange({ ...opts, ...p });

  return (
    <div className="space-y-4">
      {/* The customer wizard is single-storey and has no veranda, so these BOQ-only inputs live here.
          They feed the same take-off, so changing one re-prices immediately. */}
      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <p className="mb-3 text-sm font-semibold">
          BOQ-only structure
          <span className="ml-2 font-normal text-muted-foreground">
            — not offered in the customer wizard; affects the BOQ and the cutting list only.
          </span>
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="boq-floors" className="text-xs">Floors</Label>
            <input
              id="boq-floors"
              type="number"
              min={1}
              max={4}
              value={floors}
              onChange={(e) => {
                const n = Math.max(1, Math.min(4, Number(e.target.value) || 1));
                // A second floor always needs a staircase — don't make the admin remember.
                patch({ floors: n, staircase: n > 1 ? true : opts.staircase });
              }}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="boq-veranda" className="text-xs">Veranda width (ft) — 0 = none</Label>
            <input
              id="boq-veranda"
              type="number"
              min={0}
              step={0.5}
              value={verandaWidth}
              onChange={(e) => patch({ verandaWidthFt: Math.max(0, Number(e.target.value) || 0) })}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Staircase</Label>
            <div className="flex h-9 items-center gap-2">
              <Switch
                checked={floors > 1 || !!opts.staircase}
                disabled={floors > 1}
                onCheckedChange={(v) => patch({ staircase: v })}
              />
              <span className="text-xs text-muted-foreground">
                {floors > 1 ? "Required for G+1" : opts.staircase ? "Included" : "None"}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Handrail</Label>
            <div className="flex h-9 items-center gap-2">
              <Switch checked={!!opts.handrail} onCheckedChange={(v) => patch({ handrail: v })} />
              <span className="text-xs text-muted-foreground">
                {opts.handrail ? "Posts + rails taken off" : "None"}
              </span>
            </div>
          </div>

          {/* --- framing options (spec §5, §7, §2) --- */}
          <div className="space-y-1.5">
            <Label className="text-xs">Internal MDF support frame</Label>
            <div className="flex h-9 items-center gap-2">
              <Switch
                checked={!!opts.internalMdfSupport}
                onCheckedChange={(v) => patch({ internalMdfSupport: v })}
              />
              <span className="text-xs text-muted-foreground">
                {opts.internalMdfSupport ? "50×25 batten grid" : "Off"}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Roof-rise on corner columns</Label>
            <div className="flex h-9 items-center gap-2">
              <Switch
                checked={!!opts.cornerColumnRoofRise}
                onCheckedChange={(v) => patch({ cornerColumnRoofRise: v })}
              />
              <span className="text-xs text-muted-foreground">
                {opts.cornerColumnRoofRise ? "Added (sloped roofs)" : "Off"}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Roof rise (sloped roofs)</Label>
            <DimField
              valueFt={roofRiseFtOf(opts)}
              onCommitFt={(ft) => patch({ roofRiseFt: ft })}
              minFt={0}
              ariaLabel="Roof rise"
            />
            <p className="text-[10px] text-muted-foreground">
              Default {DEFAULT_ROOF_RISE_FT.toFixed(2)} ft (8″). Drives rafter length, roof-sheet area &amp; the 3D peak.
            </p>
          </div>
        </div>

        {verandaWidth > 0 && (
          <div className="mt-3">
            <Label className="text-xs">Veranda sides</Label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {VERANDA_SIDES.map((s) => {
                const on = sides.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      patch({ verandaSides: on ? sides.filter((x) => x !== s) : [...sides, s] })
                    }
                    className={`rounded-full border px-3 py-1 text-xs capitalize transition ${
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            {sides.length === 0 && (
              <p className="mt-1.5 text-xs text-amber-600">
                A veranda width is set but no side is selected — no veranda will be taken off.
              </p>
            )}
          </div>
        )}
      </div>

      <BoqPanel
        takeoff={takeoff}
        settings={settings}
        onSettingsChange={onSettingsChange}
        title={title}
        defaultTemplateKind={kind}
        onResult={onResult}
      />
    </div>
  );
}
