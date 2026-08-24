"use client";

/**
 * AI CONSTRUCTION ANIMATION BUILDER — the workspace shell.
 *
 * Desktop: a three-column studio — assets/settings on the left, the large preview and export
 * controls in the middle, the storyboard timeline on the right. Below 1024px the three collapse
 * into tabs, because a three-pane editor on a phone is three unusable panes.
 *
 * ── WHAT THIS COMPONENT DOES NOT DO ─────────────────────────────────────────────────────────
 * It holds no secrets, calls no third party, and never simulates progress. Every number on screen
 * came from the server, which got it from the provider. If nothing is configured, the workspace
 * says so in the readiness panel and disables generation — the rest of the tool (upload,
 * analysis, storyboard editing, save/resume) still works. Generation is gated on ALL THREE of
 * provider, database and ffmpeg being ready; see /api/animation-studio/config.
 *
 * It is loaded with next/dynamic + ssr:false from the page, so none of this ships in the initial
 * HTML and none of it competes with the service copy for crawl or LCP. The page's SEO content is
 * server-rendered and complete without it.
 */

import { useEffect, useState } from "react";
import {
  Copy,
  Download,
  Film,
  History,
  Link2,
  Loader2,
  MessageSquare,
  Play,
  Share2,
  Sliders,
  Trash2,
  Wand2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { DISCLAIMER, type AspectRatio } from "@/lib/animation/types";

import {
  AssetPanel,
  Banner,
  Disclaimer,
  FeaturesPanel,
  ProviderNotice,
  SettingsPanel,
  StatusPanel,
} from "./panels";
import { StoryboardTimeline } from "./timeline";
import { useStudio, type StudioController } from "./useStudio";

export default function AnimationStudio() {
  const studio = useStudio();

  if (studio.phase === "loading") {
    return (
      <div className="flex min-h-[24rem] items-center justify-center rounded-2xl border border-border bg-card">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          Restoring your workspace…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Renders whenever provider, database OR ffmpeg is missing — not just the provider. */}
      {studio.config && !studio.config.ready && <ProviderNotice config={studio.config} />}
      {studio.error && (
        <Banner tone="error" onDismiss={studio.dismissError}>
          {studio.error}
        </Banner>
      )}
      {studio.notice && (
        <Banner tone="notice" onDismiss={studio.dismissNotice}>
          {studio.notice}
        </Banner>
      )}

      {/* ── Desktop: three-pane studio ───────────────────────────────────────────────── */}
      <div className="hidden gap-4 lg:grid lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)_minmax(0,24rem)]">
        <aside className="space-y-6 overflow-y-auto rounded-2xl border border-border bg-background p-4 lg:max-h-[46rem]">
          <AssetPanel studio={studio} />
          {studio.project && studio.scenes.length > 0 && <FeaturesPanel studio={studio} />}
        </aside>

        <div className="space-y-4">
          <PreviewPane studio={studio} />
          <ExportPane studio={studio} />
        </div>

        <aside className="space-y-6 overflow-y-auto rounded-2xl border border-border bg-background p-4 lg:max-h-[46rem]">
          <StatusPanel studio={studio} />
          <StoryboardTimeline studio={studio} />
          {studio.project && <SettingsPanel studio={studio} />}
          {studio.project && <ProjectPane studio={studio} />}
        </aside>
      </div>

      {/* ── Mobile / tablet: the same panes as tabs ──────────────────────────────────── */}
      <div className="lg:hidden">
        <Tabs defaultValue="preview">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="assets" className="text-xs">
              Images
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-xs">
              Preview
            </TabsTrigger>
            <TabsTrigger value="storyboard" className="text-xs">
              Scenes
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs">
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assets" className="mt-4 space-y-6">
            <AssetPanel studio={studio} />
            {studio.project && studio.scenes.length > 0 && <FeaturesPanel studio={studio} />}
          </TabsContent>

          <TabsContent value="preview" className="mt-4 space-y-4">
            <StatusPanel studio={studio} />
            <PreviewPane studio={studio} />
            <ExportPane studio={studio} />
          </TabsContent>

          <TabsContent value="storyboard" className="mt-4">
            <StoryboardTimeline studio={studio} />
          </TabsContent>

          <TabsContent value="settings" className="mt-4 space-y-6">
            {studio.project ? (
              <>
                <SettingsPanel studio={studio} />
                <ProjectPane studio={studio} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Upload your first image to create a project, and the settings appear here.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Preview
 * ------------------------------------------------------------------ */

function PreviewPane({ studio }: { studio: StudioController }) {
  const [compare, setCompare] = useState(false);
  const final = studio.finalOutput ?? studio.previewOutput;
  const poster = studio.posterOutput;
  const exteriorAsset = studio.project?.assets.find((a) => a.role === "exterior");
  const aspect = studio.project?.settings.aspectRatio ?? "16:9";

  const frameClass =
    aspect === "9:16" ? "aspect-[9/16] max-h-[34rem] mx-auto" : aspect === "1:1" ? "aspect-square" : "aspect-video";

  return (
    <section aria-labelledby="studio-preview-heading" className="rounded-2xl border border-border bg-background p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 id="studio-preview-heading" className="font-display text-base font-bold text-foreground">
          Preview
        </h3>
        {final && exteriorAsset?.signedUrl && (
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground">
            <input
              type="checkbox"
              checked={compare}
              onChange={(e) => setCompare(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-border"
            />
            Compare with your reference
          </label>
        )}
      </div>

      {final?.signedUrl ? (
        <div className={cn("grid gap-3", compare && "sm:grid-cols-2")}>
          <figure>
            <video
              key={final.signedUrl}
              src={final.signedUrl}
              poster={poster?.signedUrl}
              controls
              playsInline
              preload="metadata"
              className={cn("w-full rounded-xl border border-border bg-black object-contain", frameClass)}
            >
              <track kind="captions" />
            </video>
            <figcaption className="mt-1.5 text-[11px] text-muted-foreground">
              Proposed design — {final.aspectRatio}, {final.resolution}
              {final.verifiedDurationSeconds !== null &&
                `, duration verified server-side at ${final.verifiedDurationSeconds.toFixed(3)}s`}
            </figcaption>
          </figure>

          {compare && exteriorAsset?.signedUrl && (
            <figure>
              {/* Signed private-bucket URL — see the note in panels.tsx. */}
              <img
                src={exteriorAsset.signedUrl}
                alt="Your uploaded exterior reference, shown beside the generated concept animation for comparison"
                className={cn("w-full rounded-xl border border-border bg-muted object-cover", frameClass)}
                loading="lazy"
                decoding="async"
              />
              <figcaption className="mt-1.5 text-[11px] text-muted-foreground">
                Existing reference — the design you uploaded
              </figcaption>
            </figure>
          )}
        </div>
      ) : (
        <div
          className={cn(
            "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center",
            frameClass,
          )}
        >
          <Film className="h-10 w-10 text-muted-foreground/40" aria-hidden="true" />
          <p className="mt-3 font-display text-sm font-bold text-foreground">
            {studio.scenes.length === 0
              ? "Your 30-second concept animation appears here"
              : studio.readyToExport
                ? "Every scene is rendered — export the 30-second film"
                : "Generate your scenes, then export"}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
            {studio.scenes.length === 0
              ? "Upload an exterior and an interior image on the left, then run the analysis to build the storyboard."
              : `${studio.renderedScenes} of ${studio.scenes.length} scenes rendered.`}
          </p>
        </div>
      )}

      <Disclaimer className="mt-3" />
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Generate + export
 * ------------------------------------------------------------------ */

function ExportPane({ studio }: { studio: StudioController }) {
  /* THE GATE. `ready` is provider AND database AND ffmpeg — see /api/animation-studio/config.
     Every generate and export control below reads this, never `configured` alone, so the button
     is enabled only when a render can genuinely complete end to end. */
  const ready = studio.config?.ready === true;
  const assembly = studio.config?.assemblyAvailable === true;
  const busy = studio.busy !== null;
  const provider = studio.config?.providerLabel;
  const blockedBecause = (studio.config?.blockers ?? []).map((b) => b.message).join(" ");

  // The estimate is in generated SECONDS, not rupees. This repo has no verified rate card for any
  // provider, and a currency figure here would read as a quotation.
  const estimateSeconds = Math.ceil(studio.totalDuration) * Math.max(1, studio.project?.settings.variations ?? 1);

  return (
    <section aria-labelledby="studio-export-heading" className="rounded-2xl border border-border bg-background p-4">
      <h3 id="studio-export-heading" className="font-display text-base font-bold text-foreground">
        Generate & export
      </h3>

      {studio.scenes.length > 0 && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          {studio.scenes.length} scenes · {studio.totalDuration.toFixed(1)}s ·{" "}
          {ready ? (
            <>
              about <strong className="text-foreground">{estimateSeconds}s</strong> of generated video
              requested from {provider}
            </>
          ) : (
            "generation unavailable — see the panel above"
          )}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={busy || !ready || !studio.readyToGenerate}
          onClick={() => studio.generate()}
          className="bg-amber text-white hover:bg-amber/90"
          title={
            !ready
              ? blockedBecause
              : !studio.readyToGenerate
                ? "Upload both images and build a storyboard first."
                : undefined
          }
        >
          {studio.busy === "generating" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : (
            <Wand2 className="mr-2 h-4 w-4" aria-hidden="true" />
          )}
          Generate all scenes
        </Button>

        <Button
          type="button"
          variant="outline"
          disabled={busy || !studio.readyToExport || !assembly}
          onClick={() => studio.exportVideo({ kind: "preview", resolution: "720p" })}
          title={assembly ? undefined : "This server has no ffmpeg, so clips cannot be joined into one file here."}
        >
          <Play className="mr-2 h-4 w-4" aria-hidden="true" />
          720p preview
        </Button>

        <Button
          type="button"
          disabled={busy || !studio.readyToExport || !assembly}
          onClick={() => studio.exportVideo({ kind: "final" })}
          className="bg-foreground text-background hover:bg-foreground/90"
          title={assembly ? undefined : "This server has no ffmpeg, so clips cannot be joined here."}
        >
          {studio.busy === "exporting" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : (
            <Film className="mr-2 h-4 w-4" aria-hidden="true" />
          )}
          Export 30s MP4
        </Button>
      </div>

      {studio.readyToExport && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-foreground">Also export as</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {(["16:9", "9:16", "1:1"] as AspectRatio[]).map((ratio) => (
              <Button
                key={ratio}
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                disabled={busy || !assembly}
                onClick={() => studio.exportVideo({ kind: "final", aspectRatio: ratio })}
              >
                {ratio}
              </Button>
            ))}
          </div>
        </div>
      )}

      {!assembly && studio.config && (
        <p className="mt-3 rounded-lg border border-amber/40 bg-amber/5 p-3 text-[11px] leading-relaxed text-muted-foreground">
          This server has no <code className="font-mono">ffmpeg</code>, so the scene clips cannot be
          joined into a single 30-second file here. Scenes still render and each clip is
          downloadable from its scene in the timeline. Install ffmpeg in the runtime image, or set{" "}
          <code className="font-mono">FFMPEG_PATH</code>, and the export button becomes available.
        </p>
      )}

      {studio.outputs.filter((o) => o.kind !== "poster").length > 0 && (
        <ul className="mt-4 space-y-2">
          {studio.outputs
            .filter((o) => o.kind !== "poster")
            .map((output) => (
              <li
                key={output.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card p-3"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold capitalize text-foreground">
                    {output.kind} · {output.aspectRatio} · {output.resolution}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {output.verifiedDurationSeconds !== null
                      ? `Measured ${output.verifiedDurationSeconds.toFixed(3)}s server-side`
                      : "Duration not verified"}
                    {output.byteSize ? ` · ${(output.byteSize / (1024 * 1024)).toFixed(1)} MB` : ""}
                  </p>
                </div>
                {output.signedUrl && (
                  <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                    <a href={output.signedUrl} download>
                      <Download className="mr-1.5 h-3 w-3" aria-hidden="true" />
                      Download
                    </a>
                  </Button>
                )}
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Project: share, approval, comments, versions, delete
 * ------------------------------------------------------------------ */

function ProjectPane({ studio }: { studio: StudioController }) {
  const project = studio.project!;
  const [comment, setComment] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // `loadVersions` is stable (useCallback with no deps), so listing it here does not turn the
  // panel into a poller — the effect still runs only when the section is opened.
  const { loadVersions } = studio;
  useEffect(() => {
    if (showHistory) loadVersions();
  }, [showHistory, loadVersions]);

  return (
    <section aria-labelledby="studio-project-heading" className="space-y-4">
      <h3 id="studio-project-heading" className="font-display text-base font-bold text-foreground">
        Project
      </h3>

      <div>
        <Label htmlFor="project-title" className="text-xs font-semibold">
          Project name
        </Label>
        <Input
          id="project-title"
          defaultValue={project.title}
          className="mt-1.5 h-9"
          onBlur={(e) => {
            if (e.target.value.trim() && e.target.value !== project.title) {
              studio.saveProject({ title: e.target.value, versionLabel: "Renamed" });
            }
          }}
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          Reference <code className="font-mono">{project.publicId}</code> — saved automatically. Come
          back on this browser and it resumes.
        </p>
      </div>

      {/* Approval */}
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-xs font-semibold text-foreground">Customer approval</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(
            [
              ["pending", "Sent for approval"],
              ["approved", "Approved"],
              ["changes_requested", "Changes requested"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => studio.setApproval(value)}
              aria-pressed={project.approvalStatus === value}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                project.approvalStatus === value
                  ? "border-amber bg-amber/10 text-amber"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Share */}
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">Read-only preview link</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
              Shows the finished film and the disclaimer. Never your uploads, prompts or settings.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 shrink-0 text-xs"
            disabled={studio.busy !== null}
            onClick={studio.toggleShare}
          >
            <Share2 className="mr-1.5 h-3 w-3" aria-hidden="true" />
            {project.shareEnabled ? "Revoke" : "Create"}
          </Button>
        </div>
        {project.shareEnabled && project.shareSlug && (
          <div className="mt-2 flex items-center gap-1.5">
            <Input
              readOnly
              value={studio.shareUrl ?? `/concept-animation/${project.shareSlug}`}
              className="h-8 font-mono text-[11px]"
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 shrink-0 px-2"
              onClick={() => {
                const url =
                  studio.shareUrl ??
                  `${window.location.origin}/concept-animation/${project.shareSlug}`;
                navigator.clipboard?.writeText(url);
              }}
            >
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">Copy the preview link</span>
            </Button>
          </div>
        )}
      </div>

      {/* Comments */}
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
          Revision comments
        </p>
        <Textarea
          rows={2}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What should change before this is approved?"
          className="mt-2 text-sm"
          aria-label="New revision comment"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-2 h-8 text-xs"
          disabled={!comment.trim() || studio.busy !== null}
          onClick={async () => {
            await studio.addComment(comment, null);
            setComment("");
          }}
        >
          Post comment
        </Button>

        {studio.comments.length > 0 && (
          <ul className="mt-3 space-y-2">
            {studio.comments.slice(0, 6).map((c) => (
              <li key={c.id} className="rounded border border-border p-2">
                <p className="text-[11px] font-semibold text-foreground">{c.author}</p>
                <p className={cn("mt-0.5 text-xs text-muted-foreground", c.resolved && "line-through")}>
                  {c.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Versions */}
      <div className="rounded-lg border border-border bg-card p-3">
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          aria-expanded={showHistory}
          className="flex w-full items-center justify-between text-xs font-semibold text-foreground"
        >
          <span className="flex items-center gap-1.5">
            <History className="h-3.5 w-3.5" aria-hidden="true" />
            Undo &amp; version history
          </span>
          <span className="text-[11px] text-muted-foreground">v{project.version}</span>
        </button>
        {showHistory && (
          <ul className="mt-2 space-y-1.5">
            {studio.versions.length === 0 && (
              <li className="text-[11px] text-muted-foreground">No earlier versions saved yet.</li>
            )}
            {studio.versions.map((v) => (
              <li key={v.version} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-[11px] text-muted-foreground">
                  v{v.version} · {v.label ?? "Edit"}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 shrink-0 text-[11px]"
                  disabled={studio.busy !== null}
                  onClick={() => studio.restoreVersion(v.version)}
                >
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          disabled={studio.busy !== null}
          onClick={studio.duplicateProject}
        >
          <Copy className="mr-1.5 h-3 w-3" aria-hidden="true" />
          Duplicate
        </Button>
        {studio.summaryHref && (
          <Button asChild size="sm" variant="outline" className="h-8 text-xs">
            <a href={studio.summaryHref} download>
              <Download className="mr-1.5 h-3 w-3" aria-hidden="true" />
              Project summary
            </a>
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 border-destructive/40 text-xs text-destructive hover:bg-destructive/10"
          disabled={studio.busy !== null}
          onClick={() => {
            if (confirmDelete) {
              studio.deleteProject();
              setConfirmDelete(false);
            } else {
              setConfirmDelete(true);
            }
          }}
        >
          <Trash2 className="mr-1.5 h-3 w-3" aria-hidden="true" />
          {confirmDelete ? "Tap again to delete permanently" : "Delete project & uploads"}
        </Button>
      </div>

      {confirmDelete && (
        <p className="text-[11px] leading-relaxed text-destructive">
          This permanently removes the project, every image you uploaded, every rendered clip and
          every export. It cannot be undone.
        </p>
      )}

      <p className="flex gap-1.5 border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
        <Sliders className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
        <span>{DISCLAIMER}</span>
      </p>

      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Link2 className="h-3 w-3" aria-hidden="true" />
        Uploads are private and are never published. Delete them here at any time.
      </p>
    </section>
  );
}
