"use client";

/**
 * The client boundary that lazy-loads the animation workspace.
 *
 * This tiny wrapper exists for one hard constraint: in the App Router, `next/dynamic` with
 * `ssr: false` is ONLY valid inside a Client Component. The page itself is a Server Component (so
 * the service copy, the FAQ and the schema are all in the initial HTML), so the deferral has to
 * happen one level down — here.
 *
 * The win is worth the file: the workspace is a large editor that is meaningless without a
 * session cookie and localStorage, so server-rendering it would produce an empty shell that
 * hydrates into something different. Keeping it out of the server render means a crawler gets a
 * complete service page, the LCP image is not fighting an editor bundle, and the workspace mounts
 * after the page is usable.
 */

import nextDynamic from "next/dynamic";

const AnimationStudio = nextDynamic(() => import("./AnimationStudio"), {
  ssr: false,
  loading: () => (
    <div
      className="flex min-h-[24rem] items-center justify-center rounded-2xl border border-border bg-card"
      role="status"
      aria-live="polite"
    >
      <p className="text-sm text-muted-foreground">Loading the animation workspace…</p>
    </div>
  ),
});

export function StudioMount() {
  return <AnimationStudio />;
}
