/**
 * Sliding-window rate limiter for the public enquiry endpoint. In-memory, no dependencies.
 *
 * ── WHY IN-MEMORY IS ENOUGH HERE ────────────────────────────────────────────────────────────
 * Production runs ONE long-lived `next start` process under PM2 (fork mode, see deploy notes),
 * so a module-level Map is shared by every request. It resets on deploy, which only ever makes
 * the limiter more lenient for a few minutes — never stricter. The database trigger in
 * supabase/migrations/20261012120000_enquiries_insert_hardening.sql is the durable second layer
 * (per email/phone, survives restarts, also covers the older forms that insert directly).
 *
 * Each rule is "at most `limit` events per `windowMs` for this key". A request is allowed only
 * if EVERY rule it is checked against has room; only then is it recorded against all of them,
 * so a rejected request never consumes quota.
 */

export interface RateRule {
  /** Namespace, e.g. "ip-10m". */
  name: string;
  limit: number;
  windowMs: number;
}

export interface RateDecision {
  allowed: boolean;
  /** Seconds until the tightest blocking rule frees a slot (0 when allowed). */
  retryAfterSec: number;
  /** The rule that blocked, for logs. */
  blockedBy?: string;
}

const MAX_KEYS = 20_000;

export class SlidingWindowLimiter {
  private hits = new Map<string, number[]>();

  constructor(private readonly now: () => number = Date.now) {}

  /** Check every (rule, key) pair; record the event against all of them only if all allow it. */
  take(checks: { rule: RateRule; key: string }[]): RateDecision {
    const t = this.now();
    let retryAfterMs = 0;
    let blockedBy: string | undefined;
    const live: { id: string; stamps: number[] }[] = [];

    for (const { rule, key } of checks) {
      const id = `${rule.name}:${key}`;
      const stamps = (this.hits.get(id) ?? []).filter((s) => t - s < rule.windowMs);
      if (stamps.length >= rule.limit) {
        const wait = rule.windowMs - (t - stamps[0]);
        if (wait > retryAfterMs) {
          retryAfterMs = wait;
          blockedBy = rule.name;
        }
      }
      live.push({ id, stamps });
    }

    if (blockedBy) {
      // Persist the pruned arrays so stale stamps do not accumulate, but record nothing new.
      for (const { id, stamps } of live) this.store(id, stamps);
      return { allowed: false, retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)), blockedBy };
    }
    for (const { id, stamps } of live) this.store(id, [...stamps, t]);
    return { allowed: true, retryAfterSec: 0 };
  }

  private store(id: string, stamps: number[]) {
    if (stamps.length === 0) {
      this.hits.delete(id);
      return;
    }
    if (!this.hits.has(id) && this.hits.size >= MAX_KEYS) {
      // Bounded memory under a flood of distinct keys: drop the oldest-inserted entry.
      const oldest = this.hits.keys().next().value;
      if (oldest !== undefined) this.hits.delete(oldest);
    }
    this.hits.set(id, stamps);
  }

  /** For tests. */
  size(): number {
    return this.hits.size;
  }
}

const MIN = 60_000;

/** Every request, valid or not, per client IP — stops a script hammering the validator. */
export const ATTEMPT_RULES: RateRule[] = [{ name: "attempt-ip-10m", limit: 20, windowMs: 10 * MIN }];

/** Accepted submissions. */
export const SUBMIT_RULES = {
  ip10m: { name: "submit-ip-10m", limit: 5, windowMs: 10 * MIN },
  ipDay: { name: "submit-ip-24h", limit: 20, windowMs: 24 * 60 * MIN },
  email10m: { name: "submit-email-10m", limit: 3, windowMs: 10 * MIN },
  phone10m: { name: "submit-phone-10m", limit: 3, windowMs: 10 * MIN },
  /** Whole-site circuit breaker against a distributed flood. */
  global10m: { name: "submit-global-10m", limit: 60, windowMs: 10 * MIN },
} satisfies Record<string, RateRule>;
