/**
 * Payment ENV-VALIDATION tests — the exact behaviour behind the production error
 * "Payments are not configured on this server (missing: SUPABASE_SERVICE_ROLE_KEY)".
 *
 *   npx tsx scripts/razorpay-env.test.ts
 *
 * No network, no database, no real secrets: this mutates process.env in-process with obvious
 * dummy values and asserts two contracts that matter:
 *   1. a missing variable is reported BY NAME, so an operator can fix it from the error alone;
 *   2. a variable's VALUE is never included in the message — not even when it is set.
 *
 * The empty-string cases are not hypothetical: on DigitalOcean App Platform it is easy to create
 * the key with a blank value, and a plain truthiness check would call "" configured.
 */
import {
  missingPaymentEnv,
  missingWebhookEnv,
  readPaymentEnv,
  readWebhookEnv,
  misconfiguredMessage,
} from "../src/lib/razorpay/env";

let pass = 0;
let fail = 0;
const ok = (name: string, cond: boolean) => {
  if (cond) { pass++; console.log(`   PASS  ${name}`); }
  else { fail++; console.log(`   FAIL  ${name}`); }
};

const KEYS = [
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "RAZORPAY_WEBHOOK_SECRET",
] as const;

const clearAll = () => KEYS.forEach((k) => { delete process.env[k]; });
const setAll = () => {
  process.env.RAZORPAY_KEY_ID = "rzp_test_dummy";
  process.env.RAZORPAY_KEY_SECRET = "dummy_key_secret";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://dummy.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "dummy_service_key";
  process.env.RAZORPAY_WEBHOOK_SECRET = "dummy_webhook_secret";
};

console.log("\n=============== Missing-variable detection ===============");

clearAll();
ok("nothing set -> all four checkout variables reported", missingPaymentEnv().length === 4);

setAll();
ok("everything set -> checkout reports nothing missing", missingPaymentEnv().length === 0);
ok("everything set -> webhook reports nothing missing", missingWebhookEnv().length === 0);
ok("everything set -> readPaymentEnv() returns config", readPaymentEnv() !== null);
ok("everything set -> readWebhookEnv() returns config", readWebhookEnv() !== null);

console.log("\n=============== The reported production failure ===============");

setAll();
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
const missing = missingPaymentEnv();
ok("service key absent -> exactly ['SUPABASE_SERVICE_ROLE_KEY']",
  missing.length === 1 && missing[0] === "SUPABASE_SERVICE_ROLE_KEY");
ok("message reproduces the exact production error",
  misconfiguredMessage(missing).includes("missing: SUPABASE_SERVICE_ROLE_KEY"));
ok("readPaymentEnv() returns null when incomplete", readPaymentEnv() === null);

console.log("\n=============== Blank values count as missing ===============");

setAll();
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
ok("empty string is treated as missing", missingPaymentEnv().includes("SUPABASE_SERVICE_ROLE_KEY"));

setAll();
process.env.SUPABASE_SERVICE_ROLE_KEY = "   ";
ok("whitespace-only is treated as missing", missingPaymentEnv().includes("SUPABASE_SERVICE_ROLE_KEY"));

setAll();
process.env.RAZORPAY_WEBHOOK_SECRET = "";
ok("blank webhook secret is treated as missing", missingWebhookEnv().includes("RAZORPAY_WEBHOOK_SECRET"));

console.log("\n=============== A value is NEVER exposed ===============");

setAll();
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.RAZORPAY_KEY_SECRET = "SUPER_SECRET_MUST_NOT_LEAK";
const msg = misconfiguredMessage(missingPaymentEnv());
ok("message never contains a secret's value", !msg.includes("SUPER_SECRET_MUST_NOT_LEAK"));
ok("message never contains any dummy value", !msg.includes("dummy"));
ok("message does name the missing variable", msg.includes("SUPABASE_SERVICE_ROLE_KEY"));

console.log("\n=============== Route independence ===============");

setAll();
delete process.env.RAZORPAY_WEBHOOK_SECRET;
ok("webhook secret missing -> webhook route reports it", missingWebhookEnv().includes("RAZORPAY_WEBHOOK_SECRET"));
ok("webhook secret missing -> checkout is UNAFFECTED", missingPaymentEnv().length === 0);

setAll();
delete process.env.RAZORPAY_KEY_SECRET;
ok("key secret missing -> checkout reports it", missingPaymentEnv().includes("RAZORPAY_KEY_SECRET"));
ok("key secret missing -> webhook is UNAFFECTED (different secret)", missingWebhookEnv().length === 0);

console.log("\n=============== RESULT ===============");
console.log(`   ${pass} passed · ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
