/**
 * TEST-ONLY preload: replaces the server's fetch() for the two Supabase endpoints the enquiry route
 * calls, so POST /api/enquiries can be exercised end to end WITHOUT writing to the real database
 * or sending real e-mail. Never imported by application code.
 *
 *   MOCK_SUPABASE_LOG=/path/log.jsonl MOCK_SUPABASE_MODE_FILE=/path/mode.txt \
 *   NODE_OPTIONS="--import ./scripts/mock-supabase-fetch.mjs" npx next start -p 3101
 *
 * Every intercepted call is appended to the log (credentials redacted). The mode file selects the
 * fake's behaviour per request: ok (default) | insert-fail | db-rate-limited | notify-fail.
 */
import fs from "node:fs";

const LOG = process.env.MOCK_SUPABASE_LOG;
const MODE = process.env.MOCK_SUPABASE_MODE_FILE;
if (!LOG || !MODE) throw new Error("mock-supabase-fetch: set MOCK_SUPABASE_LOG and MOCK_SUPABASE_MODE_FILE");

const TARGET = /supabase\.co\/(rest\/v1\/enquiries|functions\/v1\/send-enquiry-notification)/;
const realFetch = globalThis.fetch;
const mode = () => {
  try {
    return fs.readFileSync(MODE, "utf8").trim() || "ok";
  } catch {
    return "ok";
  }
};

globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (!TARGET.test(url)) return realFetch(input, init);

  const headers = Object.fromEntries(new Headers(init.headers || {}));
  for (const k of ["apikey", "authorization"]) if (headers[k]) headers[k] = "<redacted>";
  const kind = url.includes("/functions/") ? "notify" : "insert";
  fs.appendFileSync(
    LOG,
    JSON.stringify({ kind, url, method: init.method, headers, body: typeof init.body === "string" ? init.body : null }) + "\n",
  );

  const m = mode();
  if (kind === "insert") {
    if (m === "insert-fail") return new Response(JSON.stringify({ message: "simulated database outage" }), { status: 500 });
    if (m === "db-rate-limited") {
      return new Response(
        JSON.stringify({ code: "P0001", message: "rate_limited: too many enquiries from this email address" }),
        { status: 400 },
      );
    }
    return new Response(null, { status: 201 });
  }
  if (m === "notify-fail") return new Response(JSON.stringify({ error: "simulated SMTP failure" }), { status: 500 });
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
