// node:test + node:assert directly (not the vitest-compat shim), so tsc needs no "vitest" types.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  notifyEnquiry,
  type ClaimedEnquiry,
  type NotifyDeps,
} from "../../../supabase/functions/send-enquiry-notification/notify";
import {
  adminNotification,
  customerAcknowledgement,
  SALES_EMAIL,
} from "../../../supabase/functions/send-enquiry-notification/templates";

/**
 * send-enquiry-notification (2026-10-18 hardening): one e-mail per stored enquiry, nothing the
 * visitor typed in the acknowledgement, fail closed. These tests drive the function's own flow
 * (notify.ts) and content (templates.ts) with fakes. The fake store's check-and-set is synchronous,
 * standing in for the database's atomic INSERT … ON CONFLICT claim; the claim itself, its
 * concurrency and the rate limit are database behaviour, defined in the migration checked below.
 */

const HOSTILE = {
  name: "Ravi\r\n<img src=x onerror=alert(1)> BUY-NOW spam-site.example",
  message: "Click http://spam-site.example <script>steal()</script>",
  company: "Evil & Co <b>",
  subject: "Subject <i>x</i>",
  phone: "+91 90000 00000",
  product_name: "Office Portable Cabin <u>",
};
const VISITOR_TEXT = ["Ravi", "BUY-NOW", "spam-site", "onerror", "Click", "steal", "Evil", "Subject", "90000", "<u>"];

type Note = { token: string; claimed: boolean; sent: boolean; attempts: number; error: string | null };

/** In-memory stand-in for public.enquiries + public.enquiry_notifications. */
class FakeStore {
  private next = 0;
  notes = new Map<string, Note>();
  constructor(private enquiries: Omit<ClaimedEnquiry, "claim_token">[]) {}

  claim(email: string): ClaimedEnquiry | null {
    // Newest first, like the SQL. Check-and-set happens with no await in between (atomic).
    for (const e of [...this.enquiries].reverse()) {
      if (e.email.toLowerCase() !== email.toLowerCase()) continue;
      const n = this.notes.get(e.enquiry_id);
      const token = `tok-${(this.next += 1)}`;
      if (!n) {
        this.notes.set(e.enquiry_id, { token, claimed: true, sent: false, attempts: 1, error: null });
        return { ...e, claim_token: token };
      }
      if (!n.sent && !n.claimed && n.attempts < 3) {
        Object.assign(n, { token, claimed: true, attempts: n.attempts + 1 });
        return { ...e, claim_token: token };
      }
    }
    return null;
  }

  finish(id: string, token: string, sent: boolean, error: string | null) {
    const n = this.notes.get(id);
    if (!n || n.token !== token) return;
    if (sent) Object.assign(n, { sent: true, error });
    else if (!n.sent) Object.assign(n, { claimed: false, error });
  }
}

const enquiry = (id: string, email = "visitor@example.com", extra: Partial<ClaimedEnquiry> = {}) => ({
  enquiry_id: id,
  email,
  enquiry_type: "quote",
  ...HOSTILE,
  ...extra,
});

type Mail = { to: string; subject: string; text: string; html: string };
const tick = () => new Promise((r) => setImmediate(r));

function harness(store: FakeStore, opts: { claimThrows?: boolean; adminFails?: () => boolean; ackFails?: boolean } = {}) {
  const mails: Mail[] = [];
  const logs: string[] = [];
  const deps: NotifyDeps = {
    claim: async (email) => {
      await tick();
      if (opts.claimThrows) throw new Error("database unreachable");
      return store.claim(email);
    },
    finish: async (id, token, sent, error) => {
      await tick();
      store.finish(id, token, sent, error);
    },
    sendAdmin: async (e) => {
      await tick();
      if (opts.adminFails?.()) throw new Error("smtp down");
      mails.push({ to: "business", ...adminNotification(e) });
    },
    sendAcknowledgement: async (to) => {
      await tick();
      if (opts.ackFails) throw new Error("mailbox full");
      mails.push({ to, ...customerAcknowledgement() });
    },
    log: (m) => logs.push(m),
  };
  return { deps, mails, logs };
}

describe("customer acknowledgement", () => {
  it("takes no arguments, so nothing submitted can reach it", () => {
    assert.equal(customerAcknowledgement.length, 0);
  });

  it("contains nothing the visitor typed", async () => {
    const { deps, mails } = harness(new FakeStore([enquiry("e1")]));
    assert.equal((await notifyEnquiry("visitor@example.com", deps)).status, 200);
    const ack = mails.find((m) => m.to === "visitor@example.com");
    assert.ok(ack, "acknowledgement sent");
    for (const fragment of VISITOR_TEXT) {
      for (const part of [ack.subject, ack.text, ack.html]) assert.ok(!part.includes(fragment), `"${fragment}" leaked`);
    }
  });

  it("shows the published sales address and sets it as Reply-To", () => {
    const ack = customerAcknowledgement();
    assert.equal(SALES_EMAIL, "sales@portableofficecabin.com");
    assert.equal(ack.replyTo, SALES_EMAIL);
    assert.ok(ack.text.includes(SALES_EMAIL));
    assert.ok(ack.html.includes(`mailto:${SALES_EMAIL}`));
  });

  it("is identical whatever was submitted", async () => {
    const a = harness(new FakeStore([enquiry("e1", "a@example.com")]));
    const b = harness(new FakeStore([enquiry("e2", "b@example.com", { name: "Someone else", message: "Different" })]));
    await notifyEnquiry("a@example.com", a.deps);
    await notifyEnquiry("b@example.com", b.deps);
    const strip = (m: Mail) => ({ subject: m.subject, text: m.text, html: m.html });
    assert.deepEqual(strip(a.mails[1]), strip(b.mails[1]));
  });
});

describe("business notification", () => {
  it("escapes every stored value and keeps header text on one line", () => {
    const m = adminNotification(enquiry("e1"));
    assert.ok(!/<script|<img|<b>|<i>|<u>/.test(m.html), "no raw markup from the enquiry");
    assert.ok(m.html.includes("&lt;script&gt;steal()&lt;/script&gt;"));
    assert.ok(m.html.includes("Evil &amp; Co &lt;b&gt;"));
    assert.ok(!/[\r\n]/.test(m.subject), "subject is single-line");
  });

  it("sets no Reply-To (only the customer acknowledgement does)", () => {
    assert.equal(adminNotification(enquiry("e1")).replyTo, undefined);
  });

  it("is delivered to the owner's notification inbox with the existing authenticated sender", () => {
    const src = readFileSync(join("supabase", "functions", "send-enquiry-notification", "index.ts"), "utf8");
    assert.ok(src.includes('const BUSINESS_NOTIFICATION_TO = "portableofficecabin@gmail.com";'));
    assert.ok(src.includes("sendAdmin: (enquiry) => send(BUSINESS_NOTIFICATION_TO, adminNotification(enquiry))"));
    assert.ok(src.includes("sendAcknowledgement: (to) => send(to, customerAcknowledgement())"));
    assert.ok(src.includes("...(mail.replyTo ? { replyTo: mail.replyTo } : {})"), "Reply-To is passed to SMTP");
    // Sender unchanged: the SMTP mailbox from the function's secrets.
    assert.ok(src.includes('const smtpFrom = env("SMTP_FROM") || smtpUsername;'));
    assert.ok(src.includes('const from = `${env("SMTP_FROM_NAME") || "Portable Office Cabin"} <${smtpFrom}>`;'));
    assert.ok(!src.includes("info@portableofficecabin.com"), "no stale recipient");
  });

  it("is built from the stored enquiry, not the request", async () => {
    const { deps, mails } = harness(new FakeStore([enquiry("e1", "visitor@example.com", { message: "Stored message only" })]));
    await notifyEnquiry("VISITOR@example.com", deps);
    assert.ok(mails[0].html.includes("Stored message only"));
  });
});

describe("one e-mail per enquiry", () => {
  it("a replayed call sends nothing", async () => {
    const { deps, mails } = harness(new FakeStore([enquiry("e1")]));
    assert.equal((await notifyEnquiry("visitor@example.com", deps)).status, 200);
    for (let i = 0; i < 5; i += 1) assert.equal((await notifyEnquiry("visitor@example.com", deps)).status, 403);
    assert.equal(mails.length, 2, "one business e-mail + one acknowledgement in total");
  });

  it("parallel calls: exactly one sends", async () => {
    const { deps, mails } = harness(new FakeStore([enquiry("e1")]));
    const results = await Promise.all(Array.from({ length: 10 }, () => notifyEnquiry("visitor@example.com", deps)));
    assert.equal(results.filter((r) => r.status === 200).length, 1);
    assert.equal(results.filter((r) => r.status === 403).length, 9);
    assert.equal(mails.length, 2);
  });

  it("two stored enquiries from one address get one notification each", async () => {
    const { deps, mails } = harness(new FakeStore([enquiry("e1"), enquiry("e2")]));
    assert.equal((await notifyEnquiry("visitor@example.com", deps)).status, 200);
    assert.equal((await notifyEnquiry("visitor@example.com", deps)).status, 200);
    assert.equal((await notifyEnquiry("visitor@example.com", deps)).status, 403);
    assert.equal(mails.filter((m) => m.to === "business").length, 2);
  });

  it("an address with no stored enquiry gets nothing", async () => {
    const { deps, mails } = harness(new FakeStore([enquiry("e1")]));
    assert.equal((await notifyEnquiry("someone-else@example.com", deps)).status, 403);
    assert.equal(mails.length, 0);
  });
});

describe("failures", () => {
  it("fails closed: no claim, no e-mail", async () => {
    const { deps, mails, logs } = harness(new FakeStore([enquiry("e1")]), { claimThrows: true });
    assert.equal((await notifyEnquiry("visitor@example.com", deps)).status, 503);
    assert.equal(mails.length, 0);
    assert.match(logs.join("\n"), /claim failed, nothing sent/);
  });

  it("a failed business e-mail releases the claim; the retry sends once", async () => {
    let failures = 1;
    const store = new FakeStore([enquiry("e1")]);
    const { deps, mails } = harness(store, { adminFails: () => failures-- > 0 });
    assert.equal((await notifyEnquiry("visitor@example.com", deps)).status, 502);
    assert.equal(mails.length, 0, "no acknowledgement after a failed business e-mail");
    assert.equal((await notifyEnquiry("visitor@example.com", deps)).status, 200);
    assert.equal((await notifyEnquiry("visitor@example.com", deps)).status, 403);
    assert.equal(mails.filter((m) => m.to === "business").length, 1);
    assert.equal(store.notes.get("e1")?.attempts, 2);
  });

  it("stops retrying after 3 attempts", async () => {
    const { deps, mails } = harness(new FakeStore([enquiry("e1")]), { adminFails: () => true });
    for (let i = 0; i < 3; i += 1) assert.equal((await notifyEnquiry("visitor@example.com", deps)).status, 502);
    assert.equal((await notifyEnquiry("visitor@example.com", deps)).status, 403);
    assert.equal(mails.length, 0);
  });

  it("a failed acknowledgement is recorded and never re-sends the business e-mail", async () => {
    const store = new FakeStore([enquiry("e1")]);
    const { deps, mails } = harness(store, { ackFails: true });
    const r = await notifyEnquiry("visitor@example.com", deps);
    assert.deepEqual(r, { status: 200, body: { success: true, acknowledgement: "failed" } });
    assert.equal(store.notes.get("e1")?.sent, true);
    assert.match(store.notes.get("e1")?.error ?? "", /customer acknowledgement failed/);
    assert.equal((await notifyEnquiry("visitor@example.com", deps)).status, 403);
    assert.equal(mails.filter((m) => m.to === "business").length, 1);
  });
});

describe("migration 20261018120000 — safety properties", () => {
  const sql = readFileSync(join("supabase", "migrations", "20261018120000_enquiry_notification_claim.sql"), "utf8");
  const code = sql.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");

  it("drops nothing", () => {
    assert.ok(!/\bdrop\b/i.test(code));
  });

  it("refuses to run before the 2026-10-12 hardening", () => {
    assert.match(code, /tgname = 'enquiries_rate_limit'[\s\S]*raise exception 'Apply supabase\/migrations\/20261012120000/);
  });

  it("claims atomically, once, with a retry cap and an expiry for crashed runs", () => {
    assert.match(code, /on conflict \(enquiry_id\) do update[\s\S]*where n\.sent_at is null\s+and n\.attempts < 3\s+and \(n\.claimed_at is null or n\.claimed_at < now\(\) - interval '10 minutes'\)/);
  });

  it("exposes the claim functions to the service role only", () => {
    for (const fn of ["claim_enquiry_notification(text)", "finish_enquiry_notification(uuid, uuid, boolean, text)"]) {
      assert.ok(code.includes(`revoke all on function public.${fn} from public, anon, authenticated;`), fn);
      assert.ok(code.includes(`grant execute on function public.${fn} to service_role;`), fn);
    }
    assert.equal((code.match(/security definer\s+set search_path = public, pg_temp/g) ?? []).length, 2);
  });

  it("keeps the bookkeeping table away from the public roles", () => {
    assert.ok(code.includes("alter table public.enquiry_notifications enable row level security;"));
    assert.ok(code.includes("revoke all on table public.enquiry_notifications from public, anon, authenticated;"));
  });

  it("serialises the rate limit per address", () => {
    assert.match(code, /pg_advisory_xact_lock\(hashtextextended\('enquiries_rate_limit:email:'/);
    assert.match(code, /pg_advisory_xact_lock\(hashtextextended\('enquiries_rate_limit:phone:'/);
  });

  it("has a rollback file", () => {
    assert.ok(readFileSync(join("supabase", "rollback", "20261018120000_enquiry_notification_claim.down.sql"), "utf8").includes("drop table if exists public.enquiry_notifications"));
  });
});

describe("migration 20261018110000 — backfill of the four empty messages", () => {
  const sql = readFileSync(join("supabase", "migrations", "20261018110000_backfill_empty_enquiry_messages.sql"), "utf8");
  const code = sql.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");
  const CONFIRMED = [
    "5878ac58-57e0-4564-941e-f3dfd373adb6",
    "8cb4e17c-70e5-4d8b-8b5d-4ad18249747a",
    "dfbfe207-a654-4f71-a7f8-925ed81b4d74",
    "e865deb4-4c6c-4360-900d-79e10f4dcdce",
  ];

  it("targets exactly the four rows confirmed in production, by id", () => {
    const ids = [...code.matchAll(/'([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'/g)].map((m) => m[1]);
    assert.deepEqual(ids, CONFIRMED);
    assert.match(code, /where id = any \(target_ids\)\s+and coalesce\(char_length\(message\), 0\) = 0;/);
  });

  it("changes only the message, never deletes, inserts or drops", () => {
    assert.equal((code.match(/\bupdate public\.enquiries\b/g) ?? []).length, 1);
    assert.match(code, /update public\.enquiries\s+set message = case/);
    assert.ok(!/\b(drop|delete|truncate|insert)\b/i.test(code));
  });

  it("writes the quote form's own default text", () => {
    const modal = readFileSync(join("src", "components", "products", "EnquiryModal.tsx"), "utf8");
    assert.ok(modal.includes("`Quote request for ${enquiryName} (no message entered).`"), "the form's default");
    assert.ok(code.includes("'Quote request for ' || product_name || ' (no message entered).'"));
  });

  it("preserves updated_at (trigger off for the one UPDATE, back on in the same transaction)", () => {
    const off = code.indexOf("alter table public.enquiries disable trigger update_enquiries_updated_at;");
    const upd = code.indexOf("update public.enquiries");
    const on = code.indexOf("alter table public.enquiries enable trigger update_enquiries_updated_at;");
    assert.ok(off > 0 && off < upd && upd < on);
  });

  it("has a rollback that restores only the exact backfilled text, after the hardening rollback", () => {
    const rb = readFileSync(join("supabase", "rollback", "20261018110000_backfill_empty_enquiry_messages.down.sql"), "utf8");
    assert.match(rb, /if exists \([\s\S]*conname = 'enquiries_field_lengths_check'[\s\S]*raise exception 'Roll back 20261012120000/);
    assert.match(rb, /set message = ''\s+where id = any \(target_ids\)\s+and message = case/);
  });
});
