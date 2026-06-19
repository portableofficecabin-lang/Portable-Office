"use client";

import { useEffect } from "react";

// Root-level error boundary. Catches errors thrown in the root layout / provider
// tree (which app/error.tsx cannot catch). Must render its own <html>/<body>.
// Uses inline styles only, since the app's CSS/fonts may not be available here.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error boundary caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b1220",
          color: "#e2e8f0",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 8px" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#94a3b8", margin: "0 0 24px", lineHeight: 1.6 }}>
            The page failed to load. Please try again — if it persists, please contact us.
          </p>
          {error?.digest && (
            <p style={{ color: "#64748b", fontSize: 12, margin: "0 0 24px" }}>
              Reference: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              border: 0,
              borderRadius: 12,
              padding: "10px 20px",
              fontWeight: 600,
              cursor: "pointer",
              background: "#f59e0b",
              color: "#1a1205",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
