/**
 * READ-ONLY CONCEPT PREVIEW — /concept-animation/<share-slug>
 *
 * What the owner sends to a spouse, a parent or an architect. It shows the finished 30-second
 * film, the poster frame, the scene list and the concept-visualisation disclaimer. It shows
 * NOTHING else: not the uploaded photographs, not the prompts, not the settings, not the project
 * id, and no control that can change anything.
 *
 * ── INDEXING ────────────────────────────────────────────────────────────────────────────────
 * noindex, nofollow, and force-dynamic. A customer's house render is private content that
 * happens to be reachable by URL — putting it in the index would be a straightforward privacy
 * failure, and caching it at the edge would keep serving it after the link is revoked.
 *
 * ── ACCESS ──────────────────────────────────────────────────────────────────────────────────
 * The slug is 24 hex characters from crypto.randomBytes and is checked together with
 * `share_enabled`, so revoking the link genuinely closes the page rather than merely unlinking it.
 */

import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";

import { Layout } from "@/components/layout/Layout";
import { getCameraPreset } from "@/lib/animation/cameras";
import { studioClient, signObject, mapScene, mapOutput } from "@/lib/animation/server/repo";
import { DISCLAIMER, TOTAL_DURATION_SECONDS } from "@/lib/animation/types";
import { COMPANY } from "@/lib/company";

export const dynamic = "force-dynamic";

interface SharedProject {
  id: string;
  public_id: string;
  title: string;
  status: string;
  approval_status: string;
  share_enabled: boolean;
  updated_at: string;
}

/**
 * Resolve the share slug — ONCE per request.
 *
 * React's `cache()` memoises this for the lifetime of the request, so generateMetadata and the
 * page body below share a single database round-trip rather than each making their own.
 */
const findSharedProject = cache(async (slug: string): Promise<SharedProject | null> => {
  const admin = studioClient();
  if (!admin) return null;

  const { data } = await admin
    .from("animation_projects")
    .select("id, public_id, title, status, approval_status, share_enabled, updated_at")
    .eq("share_slug", slug)
    .eq("share_enabled", true)
    .is("deleted_at", null)
    .maybeSingle();

  return (data as SharedProject | null) ?? null;
});

/**
 * ── WHY THE 404 IS DECIDED HERE AND NOT ONLY IN THE PAGE BODY ───────────────────────────────
 * Next AWAITS generateMetadata before it begins streaming the response, so a notFound() thrown
 * here can still set the status line. A notFound() thrown later — after the page body has
 * awaited a database round-trip — arrives once the shell has already been flushed, and the
 * response is stuck at 200 with the not-found BODY inside it. That soft 404 is exactly what this
 * route had: verified by instrumenting the page and watching notFound() run while curl reported
 * "200 OK".
 *
 * It matters here more than on an ordinary page. A revoked share link must stop existing, and a
 * crawler or a link-checker reads the STATUS, not the words on the page.
 *
 * The page body keeps its own notFound() as a second line of defence; findSharedProject is
 * request-cached, so the check costs nothing the second time.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await findSharedProject(slug);
  if (!project) notFound();

  return {
    title: "Concept animation preview",
    // Private content. Never indexed, never followed, and no social preview image.
    robots: { index: false, follow: false },
  };
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;

  const admin = studioClient();
  if (!admin) notFound();

  const project = await findSharedProject(slug);
  if (!project) notFound();

  const [{ data: sceneRows }, { data: outputRows }] = await Promise.all([
    admin.from("animation_scenes").select("*").eq("project_id", project.id).order("scene_index"),
    admin
      .from("animation_outputs")
      .select("*")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false }),
  ]);

  const scenes = (sceneRows ?? []).map(mapScene);
  const outputs = (outputRows ?? []).map(mapOutput);
  const film = outputs.find((o) => o.kind === "final") ?? outputs.find((o) => o.kind === "preview") ?? null;
  const poster = outputs.find((o) => o.kind === "poster") ?? null;

  const filmUrl = film ? await signObject(admin, film.storagePath, 3600) : null;
  const posterUrl = poster ? await signObject(admin, poster.storagePath, 3600) : null;

  const totalSeconds = scenes.reduce((sum, s) => sum + s.durationSeconds, 0);

  return (
    <Layout>
      <section className="section-padding">
        <div className="container-custom max-w-4xl">
          <p className="text-sm font-medium uppercase tracking-wider text-accent">
            Concept animation preview
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-foreground sm:text-4xl">
            {project.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Shared read-only · last updated {new Date(project.updated_at).toLocaleDateString("en-IN")}
            {project.approval_status !== "not_submitted" &&
              ` · ${project.approval_status.replace(/_/g, " ")}`}
          </p>

          <div className="mt-8">
            {filmUrl ? (
              <figure>
                <video
                  src={filmUrl}
                  poster={posterUrl ?? undefined}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full rounded-2xl border border-border bg-black"
                >
                  <track kind="captions" />
                </video>
                <figcaption className="mt-2 text-sm text-muted-foreground">
                  {film?.aspectRatio} · {film?.resolution}
                  {film?.verifiedDurationSeconds !== null &&
                    film?.verifiedDurationSeconds !== undefined &&
                    ` · ${film.verifiedDurationSeconds.toFixed(2)} seconds, measured on our server`}
                </figcaption>
              </figure>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center">
                <p className="font-display text-lg font-bold text-foreground">
                  This concept animation has not finished rendering yet
                </p>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                  The storyboard is prepared and the scenes are being generated. Check this link
                  again shortly — it updates on its own.
                </p>
              </div>
            )}
          </div>

          {scenes.length > 0 && (
            <section className="mt-10">
              <h2 className="font-display text-xl font-bold text-foreground">
                What the {TOTAL_DURATION_SECONDS}-second film contains
              </h2>
              <ol className="mt-4 space-y-2">
                {scenes.map((scene) => (
                  <li key={scene.id} className="flex gap-3 rounded-xl border border-border p-4">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber/15 text-xs font-bold text-amber">
                      {scene.index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-display font-bold text-foreground">{scene.title}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {getCameraPreset(scene.cameraPreset).label} · {scene.durationSeconds.toFixed(1)}s
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-sm text-muted-foreground">
                Total {totalSeconds.toFixed(1)} seconds.
              </p>
            </section>
          )}

          <div className="mt-10 rounded-2xl border border-amber/30 bg-amber/5 p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold text-foreground">
              Please read before you judge the design by this
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{DISCLAIMER}</p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/products/home-construction/building-construction-contractor"
              className="inline-flex items-center gap-2 rounded-xl bg-amber px-5 py-3 font-semibold text-white transition-opacity hover:opacity-90"
            >
              Make your own concept animation
            </Link>
            <a
              href={`tel:${COMPANY.phones[0].e164}`}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 font-semibold transition-colors hover:bg-muted"
            >
              {COMPANY.phones[0].display}
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
}
