/**
 * ENQUIRY ENDPOINT — UNIT TESTS (validator, markup neutraliser, rate limiter)
 *
 * Run:  npm run enquiries:test
 *
 * The HTTP behaviour of POST /api/enquiries (origin check, 400/413/415/429/502, honeypot, the
 * insert and notification payloads) is exercised against a running build by
 * scripts/enquiry-api-http.test.mjs, with Supabase replaced by an in-process fake so no row is
 * ever written to the real database.
 */

import {
  CUSTOM_MODEL,
  ENQUIRY_LIMITS,
  neutraliseMarkup,
  validateCategoryEnquiry,
} from "../src/lib/enquiries/categoryEnquiry";
import { NOTIFY_RULES, SlidingWindowLimiter, SUBMIT_RULES, type RateRule } from "../src/lib/enquiries/rateLimit";

let passed = 0;
let failed = 0;
const check = (cond: boolean, label: string) => {
  if (cond) passed++;
  else {
    failed++;
    console.log(`  FAIL  ${label}`);
  }
};
const section = (title: string) => console.log(`\n${title}`);

const valid = {
  name: "Asha Rao",
  phone: "+91 98765 43210",
  email: "Asha@Example.com",
  model: "6",
  size: "20 ft x 10 ft",
  quantity: "2",
  location: "Hosur",
  pincode: "635109",
  specs: "PUF walls",
  message: "Please call after 5 pm",
};

section("1. Validator accepts a normal enquiry and normalises it");
{
  const { data, errors } = validateCategoryEnquiry(valid);
  check(Object.keys(errors).length === 0, "no errors for a valid enquiry");
  check(data.email === "asha@example.com", "email lower-cased");
  check(data.qty === 2, "quantity parsed");
  check(data.model === "6", "catalogue id kept");
}

section("2. Validator rejects bad input");
const errs = (patch: Partial<typeof valid>) => validateCategoryEnquiry({ ...valid, ...patch }).errors;
check(!!errs({ name: "" }).name, "empty name");
check(!!errs({ name: "x".repeat(ENQUIRY_LIMITS.name + 1) }).name, "over-long name");
check(!!errs({ phone: "12345" }).phone, "short phone");
check(!!errs({ phone: "call me maybe" }).phone, "non-numeric phone");
check(!!errs({ email: "not-an-email" }).email, "bad email");
check(!!errs({ email: 'a"b@x.com' }).email, "quote in email (attribute-breaking)");
check(!!errs({ email: "<a@b.co>" }).email, "angle brackets in email");
check(!!errs({ quantity: "0" }).quantity, "quantity 0");
check(!!errs({ quantity: "501" }).quantity, "quantity over 500");
check(!!errs({ quantity: "2.5" }).quantity, "fractional quantity");
check(!!errs({ location: "" }).location, "missing location");
check(!!errs({ pincode: "56010" }).pincode, "5-digit PIN");
check(!errs({ pincode: "" }).pincode, "PIN optional");
check(!!errs({ specs: "s".repeat(ENQUIRY_LIMITS.specs + 1) }).specs, "over-long specs");
check(!!errs({ message: "m".repeat(ENQUIRY_LIMITS.message + 1) }).message, "over-long message");
{
  const { data } = validateCategoryEnquiry({ ...valid, model: "x'; drop table--" });
  check(data.model === CUSTOM_MODEL, "unrecognisable model id falls back to custom");
}
{
  const { data } = validateCategoryEnquiry({ ...valid, name: "Asha\u0000\u0007 Rao\r\nInjected: header", specs: "line 1\r\nline 2" });
  check(![...data.name].some((ch) => ch.charCodeAt(0) < 32), "control characters stripped");
  check(!data.name.includes("\n"), "newline removed from a single-line field");
  check(data.specs === "line 1\nline 2", "multi-line field keeps its line breaks, CRLF normalised");
}
check(Object.keys(validateCategoryEnquiry({}).errors).length >= 4, "empty object fails on every required field");
check(Object.keys(validateCategoryEnquiry({ name: 5, email: [], phone: {} } as never).errors).length >= 3, "non-string values rejected");

section("3. Markup neutraliser");
{
  const out = neutraliseMarkup('<script>alert(1)</script><img src=x onerror="y">');
  check(!out.includes("<") && !out.includes(">"), "no angle brackets survive");
  check(out.includes("script"), "text content preserved (readable)");
}

section("4. Sliding-window limiter");
{
  let now = 1_000_000;
  const limiter = new SlidingWindowLimiter(() => now);
  const rule: RateRule = { name: "t", limit: 3, windowMs: 60_000 };
  const take = () => limiter.take([{ rule, key: "ip-a" }]);
  check(take().allowed && take().allowed && take().allowed, "3 allowed inside the window");
  const blocked = take();
  check(!blocked.allowed && blocked.blockedBy === "t", "4th blocked");
  check(blocked.retryAfterSec === 60, "Retry-After = time until the oldest hit expires");
  check(limiter.take([{ rule, key: "ip-b" }]).allowed, "other keys unaffected");
  now += 60_001;
  check(take().allowed, "allowed again after the window passes");

  // A request blocked by one rule must not consume quota under another.
  const a: RateRule = { name: "a", limit: 1, windowMs: 60_000 };
  const b: RateRule = { name: "b", limit: 5, windowMs: 60_000 };
  limiter.take([{ rule: a, key: "k" }, { rule: b, key: "k" }]);
  for (let i = 0; i < 4; i++) limiter.take([{ rule: a, key: "k" }, { rule: b, key: "k" }]);
  check(limiter.take([{ rule: b, key: "k" }]).allowed, "rejected requests did not use up rule b");

  // Bounded memory under a flood of distinct keys.
  const flood = new SlidingWindowLimiter(() => now);
  for (let i = 0; i < 20_050; i++) flood.take([{ rule, key: `k${i}` }]);
  check(flood.size() <= 20_000, `key store bounded (${flood.size()})`);
}

section("5. Production rule set");
{
  let now = 0;
  const limiter = new SlidingWindowLimiter(() => now);
  const submit = (ip: string, email: string, phone: string) =>
    limiter.take([
      { rule: SUBMIT_RULES.ip10m, key: ip },
      { rule: SUBMIT_RULES.ipDay, key: ip },
      { rule: SUBMIT_RULES.email10m, key: email },
      { rule: SUBMIT_RULES.phone10m, key: phone },
    ]);
  const sameEmail = [1, 2, 3, 4].map((i) => submit(`10.0.0.${i}`, "same@example.com", `90000000${i}0`).allowed);
  check(sameEmail.join() === "true,true,true,false", "4th from the same email blocked even from new IPs");
  const sameIp = [1, 2, 3, 4, 5, 6].map((i) => submit("10.9.9.9", `u${i}@example.com`, `91111111${i}0`).allowed);
  check(sameIp.join() === "true,true,true,true,true,false", "6th from one IP in 10 minutes blocked");
  now += 11 * 60_000;
  check(submit("10.9.9.9", "later@example.com", "9222222220").allowed, "IP allowed again after 10 minutes");

  // Denial-of-service review: a distributed flood (many IPs, e-mails, phones) must never lock real
  // senders out — no submission rule is site-wide.
  check(Object.values(SUBMIT_RULES).every((r) => !/global|site|all/.test(r.name)), "no site-wide SUBMISSION rule");
  const flood = Array.from({ length: 200 }, (_, i) => submit(`172.16.${i >> 8}.${i & 255}`, `f${i}@example.com`, `93${String(i).padStart(8, "0")}`).allowed);
  check(flood.every(Boolean), "200 distinct senders in 10 minutes are all accepted (nobody locked out)");
  check(submit("10.1.2.3", "real.customer@example.com", "9876543210").allowed, "a real customer is still accepted during the flood");

  // The site-wide limit only budgets e-mails: after `limit` notifications in the window, later
  // enquiries are stored but not e-mailed.
  const budget = new SlidingWindowLimiter(() => now);
  const mails = Array.from({ length: NOTIFY_RULES.global10m.limit + 5 }, () => budget.take([{ rule: NOTIFY_RULES.global10m, key: "all" }]).allowed);
  check(mails.filter(Boolean).length === NOTIFY_RULES.global10m.limit, `e-mail budget: ${NOTIFY_RULES.global10m.limit} notifications per 10 minutes, the rest suppressed`);
  now += 11 * 60_000;
  check(budget.take([{ rule: NOTIFY_RULES.global10m, key: "all" }]).allowed, "e-mail budget refills after 10 minutes");
}

console.log(`\nenquiry-api.test.ts — ${passed} passed, ${failed} failed`);
process.exitCode = failed > 0 ? 1 : 0;
