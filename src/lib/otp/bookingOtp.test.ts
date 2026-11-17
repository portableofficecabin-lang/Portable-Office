// node:test + node:assert directly (not the vitest-compat shim), so tsc needs no "vitest" types.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  EMAIL_MAX,
  generateOTP,
  hashOTP,
  normaliseEmail,
  OTP_FORMAT,
} from "../../../supabase/functions/_shared/otp";
import { otpEmail } from "../../../supabase/functions/send-booking-otp/templates";

/**
 * Verification codes (2026-11-05 hardening): send-booking-otp, verify-booking-otp and
 * signup-with-otp. The send limits and the wrong-guess limit are database behaviour
 * (supabase/migrations/20261105120000_booking_otp_limits.sql); these tests pin the shared helpers,
 * the e-mail content and how each function uses the database functions.
 */

// Tests run from the repository root (npm test), like the other source-reading tests.
const read = (path: string) => readFileSync(join(...path.split("/")), "utf8");
const fn = (name: string) => read(`supabase/functions/${name}/index.ts`);
const MIGRATION = "supabase/migrations/20261105120000_booking_otp_limits.sql";

describe("shared code helpers", () => {
  it("generates 6-digit codes", () => {
    for (let i = 0; i < 200; i += 1) assert.match(generateOTP(), OTP_FORMAT);
  });

  it("hashes exactly as the earlier per-function copies did: SHA-256(code + secret) in hex", async () => {
    const expected = createHash("sha256").update("123456" + "secret-key").digest("hex");
    assert.equal(await hashOTP("123456", "secret-key"), expected);
    assert.match(expected, /^[0-9a-f]{64}$/);
  });

  it("normalises addresses and rejects implausible ones", () => {
    assert.equal(normaliseEmail("  Ravi@Example.COM \n"), "ravi@example.com");
    for (const bad of ["", "no-at-sign", "a@b", "a b@c.de", "<x>@y.zz", null, undefined, 42]) {
      assert.equal(normaliseEmail(bad), null, String(bad));
    }
    assert.equal(normaliseEmail(`${"a".repeat(EMAIL_MAX)}@x.in`), null);
  });
});

describe("verification e-mail", () => {
  it("contains the code and nothing the visitor typed", () => {
    const mail = otpEmail("482913");
    assert.ok(mail.html.includes("482913") && mail.text.includes("482913"));
    assert.ok(!/customer_name|\$\{/.test(mail.html), "no leftover interpolation");
    assert.match(mail.html, /Hello,<\/p>/);
    assert.equal(mail.subject, "Your Portable Office Cabin verification code");
  });

  it("refuses anything that is not a 6-digit code", () => {
    assert.throws(() => otpEmail("<b>12</b>"));
    assert.throws(() => otpEmail("1234567"));
  });
});

describe("send-booking-otp", () => {
  const src = fn("send-booking-otp");

  it("sends through pinned nodemailer over implicit TLS with timeouts, not denomailer", () => {
    assert.match(src, /from "npm:nodemailer@6\.9\.16"/);
    assert.match(src, /@deno-types="npm:@types\/nodemailer@6\.4\.17"/);
    assert.doesNotMatch(src, /^import .*denomailer|SMTPClient\(/m);
    assert.match(src, /secure: port === 465/);
    for (const t of ["connectionTimeout: 10_000", "greetingTimeout: 10_000", "socketTimeout: 20_000"]) {
      assert.ok(src.includes(t), t);
    }
  });

  it("stores the code through issue_booking_otp before e-mailing, and never uses the name", () => {
    const issue = src.indexOf('rpc<string>("issue_booking_otp"');
    const send = src.indexOf("transport.sendMail(");
    assert.ok(issue > 0 && send > issue, "issue_booking_otp is called before sendMail");
    assert.doesNotMatch(src, /customer_name\b(?!\s+is accepted)/, "customer_name is not read");
    assert.match(src, /json\(429/);
    assert.match(src, /json\(503/);
    assert.doesNotMatch(src, /\.from\("booking_otps"\)/, "no direct table access left");
  });

  it("does not log the code", () => {
    assert.doesNotMatch(src, /console\.\w+\([^)]*(\$\{otp\}|,\s*otp\b)/);
  });
});

describe("verify-booking-otp and signup-with-otp", () => {
  for (const name of ["verify-booking-otp", "signup-with-otp"]) {
    const src = fn(name);
    it(`${name} checks the code only through check_booking_otp`, () => {
      assert.match(src, /rpc<string>\("check_booking_otp"/);
      assert.doesNotMatch(src, /\.from\("booking_otps"\)/);
      assert.doesNotMatch(src, /constantTimeCompare/);
      assert.match(src, /from "\.\.\/_shared\/otp\.ts"/);
    });
  }

  it("signup creates the account only after a valid code", () => {
    const src = fn("signup-with-otp");
    const check = src.indexOf('rpc<string>("check_booking_otp"');
    const guard = src.indexOf('if (outcome !== "valid")');
    const create = src.indexOf("auth.admin.createUser(");
    assert.ok(check > 0 && guard > check && create > guard);
  });
});

describe("migration 20261105120000", () => {
  const sql = read(MIGRATION);
  const code = sql
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n");

  it("is additive and re-runnable", () => {
    assert.doesNotMatch(code, /\bdrop\b/i);
    assert.match(code, /add column if not exists failed_attempts/);
    assert.match(code, /create table if not exists public\.booking_otp_sends/);
    assert.match(code, /create or replace function public\.issue_booking_otp/);
    assert.match(code, /create or replace function public\.check_booking_otp/);
  });

  it("keeps both functions service-role only, with a fixed search_path and per-address locks", () => {
    for (const f of ["issue_booking_otp(text, text)", "check_booking_otp(text, text)"]) {
      assert.ok(code.includes(`revoke all on function public.${f} from public, anon, authenticated;`), f);
      assert.ok(code.includes(`grant execute on function public.${f} to service_role;`), f);
    }
    assert.equal((code.match(/security definer/g) ?? []).length, 2);
    assert.equal((code.match(/set search_path = public, pg_temp/g) ?? []).length, 2);
    assert.match(code, /pg_advisory_xact_lock\(hashtextextended\('booking_otp_issue:'/);
    assert.match(code, /pg_advisory_xact_lock\(hashtextextended\('booking_otp_check:'/);
    assert.match(code, /revoke all on table public\.booking_otp_sends from public, anon, authenticated;/);
  });

  it("sets the agreed limits: 60 s, 5 an hour, 10 a day, 5 wrong guesses", () => {
    assert.match(code, /interval '60 seconds'/);
    assert.match(code, /sent_hour >= 5 or sent_day >= 10/);
    assert.match(code, /failed_attempts < 5/);
  });

  it("has a rollback", () => {
    const down = read("supabase/rollback/20261105120000_booking_otp_limits.down.sql");
    assert.match(down, /drop function if exists public\.issue_booking_otp\(text, text\);/);
    assert.match(down, /drop function if exists public\.check_booking_otp\(text, text\);/);
  });
});
