/**
 * PROVIDER REGISTRY — the one place a provider id becomes an adapter.
 *
 * `resolveVideoProvider()` returns null when nothing is configured. Every caller must handle
 * that: the render routes answer 503 with the missing variable names and the workspace shows the
 * "Video provider configuration required" state. Nothing falls back to a stub, a sample file or a
 * simulated success — that is the single most important rule in this feature.
 */

import { missingVideoEnv, requiredEnvFor, selectedProviderId } from "../env";
import { genericProvider } from "./generic";
import { veoProvider } from "./veo";
import type { VideoProvider } from "./types";

export * from "./types";

const REGISTRY: Record<string, VideoProvider> = {
  "google-veo": veoProvider,
  generic: genericProvider,
};

export function resolveVideoProvider(): VideoProvider | null {
  const id = selectedProviderId();
  if (!id) return null;
  if (missingVideoEnv().length > 0) return null;
  return REGISTRY[id] ?? null;
}

/** Everything /api/animation-studio/config needs, in one call. Names only — never values. */
export function providerStatus() {
  const id = selectedProviderId();
  const missing = missingVideoEnv();
  const provider = missing.length === 0 && id ? (REGISTRY[id] ?? null) : null;
  return {
    configured: provider !== null,
    providerId: provider?.id ?? null,
    providerLabel: provider?.label ?? null,
    missingEnv: missing,
    requiredEnv: requiredEnvFor(id),
    capabilities: provider?.capabilities ?? null,
  };
}
