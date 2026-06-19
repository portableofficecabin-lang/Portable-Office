"use client";

import { useEffect } from "react";

// Route-level error boundary. Catches client/render errors in the page subtree
// so a single failing component shows a recoverable message instead of blanking
// the whole site.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the real error in the console for debugging.
    console.error("Route error boundary caught:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6 py-20 bg-background text-foreground">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl font-bold mb-2">Something went wrong</h1>
        <p className="text-muted-foreground mb-6">
          We hit an unexpected error loading this page. Please try again — if it keeps happening,
          contact us and we&apos;ll sort it out.
        </p>
        {error?.digest && (
          <p className="text-xs text-muted-foreground/70 mb-6">Reference: {error.digest}</p>
        )}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-xl bg-accent px-5 py-2.5 font-semibold text-accent-foreground hover:opacity-90 transition"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-xl border border-border px-5 py-2.5 font-semibold hover:bg-muted transition"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
