"use client";

import { useEffect } from "react";

// Admin-scoped error boundary. Contains a crash in any single admin module so it
// shows a recoverable message (with the error digest for debugging) instead of
// blanking the whole admin shell or bubbling up to the root error boundary.
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin error boundary caught:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6 py-20 bg-background text-foreground">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl font-bold mb-2">This section hit an error</h1>
        <p className="text-muted-foreground mb-6">
          Something went wrong loading this part of the admin panel. You can retry — if it keeps
          happening, note the reference below.
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
            href="/admin"
            className="rounded-xl border border-border px-5 py-2.5 font-semibold hover:bg-muted transition"
          >
            Back to dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
