// node:test + node:assert directly (not the vitest-compat shim), so tsc needs no "vitest" types.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  notifyAppointment,
  type ClaimedAppointment,
  type NotifyDeps,
} from "../../../supabase/functions/send-appointment-confirmation/notify";
import {
  adminNotification,
  customerConfirmation,
  formatDate,
  formatTime,
  knownService,
  SALES_EMAIL,
  SERVICE_TYPES,
} from "../../../supabase/functions/send-appointment-confirmation/templates";

/**
 * send-appointment-confirmation (2026-11-05 hardening): one e-mail set per stored booking, nothing
 * the visitor typed in the customer confirmation, fail closed. These tests drive the function's own
 * flow (notify.ts) and content (templates.ts) with fakes; the claim, its concurrency and the rate
 * limit are database behaviour, defined in the migration checked below.
 */

// Tests run from the repository root (npm test), like the other source-reading tests.
const read = (path: string) => readFileSync(join(...path.split("/")), "utf8");

const HOSTILE: ClaimedAppointment = {
  appointment_id: "a1",
  claim_token: "t1",
  customer_name: "Ravi\r\n<img src=x onerror=alert(1)> BUY-NOW spam-site.example",
  customer_email: "victim@example.com",
  customer_phone: "+91 90000 00000",
  company: "Evil & Co <b>",
  appointment_date: "2026-11-12",
  appointment_time: "10:30:00",
  service_type: "Click http://spam-site.example <script>steal()</script>",
  notes: "Visit http://spam-site.example <script>steal()</script>",
};
const VISITOR_TEXT = ["Ravi", "BUY-NOW", "spam-site", "onerror", "Click", "steal", "Evil", "90000", "Visit"];

function deps(overrides: Partial<NotifyDeps> = {}) {
  const sent: { to: string; kind: "admin" | "customer" }[] = [];
  const finishes: { sent: boolean; error: string | null }[] = [];
  const logs: string[] = [];
  const d: NotifyDeps = {
    claim: async () => ({ ...HOSTILE }),
    finish: async (_id, _token, s, error) => {
      finishes.push({ sent: s, error });
    },
    adminRecipients: ["sales@portableofficecabin.com", "portableofficecabin@gmail.com"],
    sendAdmin: async (to) => {
      sent.push({ to, kind: "admin" });
    },
    sendConfirmation: async (a) => {
      sent.push({ to: a.customer_email, kind: "customer" });
    },
    log: (m) => logs.push(m),
    ...overrides,
  };
  return { d, sent, finishes, logs };
}

describe("notification flow", () => {
  it("e-mails both business inboxes, records sent, then confirms to the stored address", async () => {
    const { d, sent, finishes } = deps();
    const r = await notifyAppointment("victim@example.com", d);
    assert.deepEqual(r, { status: 200, body: { success: true, confirmation: "sent" } });
    assert.deepEqual(sent, [
      { to: "sales@portableofficecabin.com", kind: "admin" },
      { to: "portableofficecabin@gmail.com", kind: "admin" },
      { to: "victim@example.com", kind: "customer" },
    ]);
    assert.deepEqual(finishes, [{ sent: true, error: null }]);
  });

  it("nothing claimable (replay, duplicate, no recent booking) → 403 and no e-mail", async () => {
    const { d, sent, finishes } = deps({ claim: async () => null });
    const r = await notifyAppointment("victim@example.com", d);
    assert.equal(r.status, 403);
    assert.equal(sent.length + finishes.length, 0);
  });

  it("claim fails → 503 and no e-mail (fail closed)", async () => {
    const { d, sent } = deps({
      claim: async () => {
        throw new Error("db down");
      },
    });
    assert.equal((await notifyAppointment("victim@example.com", d)).status, 503);
    assert.equal(sent.length, 0);
  });

  it("every business e-mail fails → 502, claim released, customer not e-mailed", async () => {
    const { d, sent, finishes } = deps({
      sendAdmin: async () => {
        throw new Error("535 auth");
      },
    });
    const r = await notifyAppointment("victim@example.com", d);
    assert.equal(r.status, 502);
    assert.equal(sent.length, 0);
    assert.equal(finishes.length, 1);
    assert.equal(finishes[0].sent, false);
    assert.match(finishes[0].error ?? "", /535 auth/);
  });

  it("one business inbox fails → still sent (recorded with the failure), customer confirmed", async () => {
    const { d, sent, finishes } = deps({
      sendAdmin: async (to) => {
        if (to.endsWith("gmail.com")) throw new Error("mailbox full");
        sent.push({ to, kind: "admin" });
      },
    });
    const r = await notifyAppointment("victim@example.com", d);
    assert.equal(r.status, 200);
    assert.deepEqual(sent.map((s) => s.kind), ["admin", "customer"]);
    assert.equal(finishes[0].sent, true);
    assert.match(finishes[0].error ?? "", /gmail\.com failed: mailbox full/);
  });

  it("customer confirmation fails → 200 confirmation:failed, recorded, not retried", async () => {
    const { d, finishes } = deps({
      sendConfirmation: async () => {
        throw new Error("rejected");
      },
    });
    const r = await notifyAppointment("victim@example.com", d);
    assert.deepEqual(r, { status: 200, body: { success: true, confirmation: "failed" } });
    assert.deepEqual(finishes.map((f) => f.sent), [true, true]);
    assert.match(finishes[1].error ?? "", /customer confirmation failed: rejected/);
  });
});

describe("customer confirmation", () => {
  it("contains nothing the visitor typed, even from a hostile stored row", () => {
    const mail = customerConfirmation(HOSTILE);
    for (const t of VISITOR_TEXT) {
      assert.ok(!mail.html.includes(t) && !mail.text.includes(t) && !mail.subject.includes(t), t);
    }
  });

  it("shows the booked date and time, and the service only when it is a form option", () => {
    const mail = customerConfirmation({ ...HOSTILE, service_type: "Site Office Enquiry" });
    assert.ok(mail.html.includes("12 Nov 2026") && mail.html.includes("10:30"));
    assert.ok(mail.html.includes("Site Office Enquiry") && mail.text.includes("(Site Office Enquiry)"));
    assert.ok(!customerConfirmation(HOSTILE).html.includes("Service:"));
  });

  it("points to sales@ (not info@) and sets it as Reply-To", () => {
    const mail = customerConfirmation(HOSTILE);
    assert.equal(mail.replyTo, SALES_EMAIL);
    assert.ok(mail.html.includes(SALES_EMAIL) && mail.text.includes(SALES_EMAIL));
    assert.ok(!/info@/.test(mail.html + mail.text));
  });

  it("formats only well-formed values", () => {
    assert.equal(formatDate("2026-01-05"), "5 Jan 2026");
    assert.equal(formatDate("2026-13-05"), null);
    assert.equal(formatDate("<b>"), null);
    assert.equal(formatTime("17:00:00"), "17:00");
    assert.equal(formatTime("25:00"), null);
    assert.equal(knownService("General Consultation"), "General Consultation");
    assert.equal(knownService("General Consultation "), null);
  });

  it("knows exactly the booking form's service options", () => {
    const form = read("src/views/BookAppointment.tsx");
    const list = form.slice(form.indexOf("const serviceTypes = ["), form.indexOf("];", form.indexOf("const serviceTypes = [")));
    const options = [...list.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(options, [...SERVICE_TYPES]);
  });
});

describe("business notification", () => {
  it("escapes every stored value and keeps header values on one line", () => {
    const mail = adminNotification(HOSTILE);
    assert.ok(!/<img|<script|<b>/i.test(mail.html), "no raw markup from the row");
    assert.ok(mail.html.includes("&lt;img src=x onerror=alert(1)&gt;"));
    assert.ok(mail.html.includes("Evil &amp; Co &lt;b&gt;"));
    assert.ok(!/[\r\n]/.test(mail.subject));
    assert.ok(mail.html.includes("+91 90000 00000"), "phone is shown to the business");
  });
});

describe("send-appointment-confirmation index.ts", () => {
  const src = read("supabase/functions/send-appointment-confirmation/index.ts");

  it("sends through pinned nodemailer over implicit TLS with timeouts, not denomailer", () => {
    assert.match(src, /from "npm:nodemailer@6\.9\.16"/);
    assert.doesNotMatch(src, /^import .*denomailer|SMTPClient\(/m);
    assert.match(src, /secure: port === 465/);
    for (const t of ["connectionTimeout: 10_000", "greetingTimeout: 10_000", "socketTimeout: 20_000"]) {
      assert.ok(src.includes(t), t);
    }
  });

  it("reads only the address from the request and claims before any e-mail", () => {
    assert.match(src, /rpc<ClaimedAppointment\[\]>\("claim_appointment_notification"/);
    assert.doesNotMatch(src, /appointment\.(notes|company|customer_name)/);
    assert.match(src, /send\(appointment\.customer_email, customerConfirmation\(appointment\)\)/);
  });

  it("keeps the business recipients unchanged", () => {
    assert.match(src, /"sales@portableofficecabin\.com",\s*"portableofficecabin@gmail\.com",/);
  });
});

describe("migration 20261105130000", () => {
  const code = read("supabase/migrations/20261105130000_appointment_notification_claim.sql")
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n");

  it("is additive and re-runnable", () => {
    assert.doesNotMatch(code, /\bdrop\b/i);
    assert.match(code, /create table if not exists public\.appointment_notifications/);
    assert.match(code, /create or replace function public\.claim_appointment_notification/);
    assert.match(code, /if not exists \(\s*select 1 from pg_trigger/);
    assert.match(code, /if not exists \(\s*select 1 from pg_constraint/);
  });

  it("keeps the claim functions service-role only and the rate limit race-free", () => {
    for (const f of ["claim_appointment_notification(text)", "finish_appointment_notification(uuid, uuid, boolean, text)"]) {
      assert.ok(code.includes(`revoke all on function public.${f} from public, anon, authenticated;`), f);
      assert.ok(code.includes(`grant execute on function public.${f} to service_role;`), f);
    }
    assert.match(code, /revoke all on table public\.appointment_notifications from public, anon, authenticated;/);
    assert.match(code, /pg_advisory_xact_lock\(hashtextextended\('appointments_rate_limit:email:'/);
    assert.match(code, /if recent >= 3 then/);
  });

  it("has a rollback", () => {
    const down = read("supabase/rollback/20261105130000_appointment_notification_claim.down.sql");
    assert.match(down, /drop table if exists public\.appointment_notifications;/);
    assert.match(down, /drop trigger if exists appointments_rate_limit on public\.appointments;/);
  });
});
