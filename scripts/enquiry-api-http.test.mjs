/**
 * POST /api/enquiries — HTTP behaviour against a RUNNING build whose Supabase calls are faked by
 * scripts/mock-supabase-fetch.mjs (so nothing reaches the real database or inbox).
 *
 *   node scripts/enquiry-api-http.test.mjs <origin> <mock-log.jsonl> <mode-file>
 *
 * Each group uses its own X-Real-IP so the per-IP limits of one group cannot leak into another.
 */
import fs from "node:fs";

const [origin = "http://localhost:3101", LOG, MODE] = process.argv.slice(2);
if (!LOG || !MODE) {
  console.error("usage: node scripts/enquiry-api-http.test.mjs <origin> <mock-log.jsonl> <mode-file>");
  process.exitCode = 2;
} else {
  await main();
}

async function main() {
  let passed = 0;
  let failed = 0;
  const check = (cond, label, detail = "") => {
    if (cond) passed++;
    else {
      failed++;
      console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
    }
  };
  const setMode = (m) => fs.writeFileSync(MODE, m);
  const logLines = () =>
    fs.existsSync(LOG) ? fs.readFileSync(LOG, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
  const goodFields = (over = {}) => ({
    name: "Test Buyer",
    phone: "+91 98765 43210",
    email: "buyer@example.com",
    model: "6",
    size: "20 ft x 10 ft",
    quantity: "2",
    location: "Hosur",
    pincode: "635109",
    specs: "PUF walls <b>bold</b>",
    message: "Call after 5 pm",
    ...over,
  });
  const post = (body, { ip = "203.0.113.1", headers = {}, raw } = {}) =>
    fetch(`${origin}/api/enquiries`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
        Referer: `${origin}/products/category/security-cabins`,
        "X-Real-IP": ip,
        ...headers,
      },
      body: raw ?? JSON.stringify(body),
    });
  const submit = (fields, opts = {}) =>
    post({ categorySlug: "security-cabins", fields, website: "", elapsedMs: 9000, ...(opts.extra || {}) }, opts);

  fs.writeFileSync(LOG, "");
  setMode("ok");

  console.log("\n1. Method, origin, content type, size, shape");
  check((await fetch(`${origin}/api/enquiries`)).status === 405, "GET → 405");
  {
    const r = await fetch(`${origin}/api/enquiries`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Real-IP": "203.0.113.2" },
      body: "{}",
    });
    check(r.status === 403, "no Origin → 403", String(r.status));
  }
  check((await post({}, { ip: "203.0.113.2", headers: { Origin: "https://evil.example" } })).status === 403, "foreign Origin → 403");
  check((await post({}, { ip: "203.0.113.2", headers: { "Content-Type": "text/plain" } })).status === 415, "text/plain → 415");
  check((await post(null, { ip: "203.0.113.2", raw: JSON.stringify({ pad: "x".repeat(20_000) }) })).status === 413, "20 KB body → 413");
  check((await post(null, { ip: "203.0.113.2", raw: "{not json" })).status === 400, "malformed JSON → 400");
  check((await post({ categorySlug: "portable-cabins", fields: goodFields() }, { ip: "203.0.113.2" })).status === 400, "category without a landing section → 400");
  {
    const r = await submit(goodFields({ email: "nope", phone: "12", quantity: "0" }), { ip: "203.0.113.2" });
    const b = await r.json();
    check(r.status === 400 && b.errors?.email && b.errors?.phone && b.errors?.quantity, "invalid fields → 400 with per-field errors", JSON.stringify(b));
  }
  check(logLines().length === 0, "nothing reached Supabase for any rejected request");

  console.log("\n2. Bots are acknowledged and dropped");
  {
    const r = await submit(goodFields({ email: "bot1@example.com" }), { ip: "203.0.113.3", extra: { website: "http://spam" } });
    check(r.status === 201, "honeypot → 201 (looks like success)");
    const r2 = await submit(goodFields({ email: "bot2@example.com" }), { ip: "203.0.113.3", extra: { elapsedMs: 300 } });
    check(r2.status === 201, "filled in 0.3 s → 201 (looks like success)");
    check(logLines().length === 0, "neither bot submission inserted or e-mailed");
  }

  console.log("\n3. A real submission");
  {
    const r = await submit(goodFields({ email: "Real.Buyer@Example.com" }), { ip: "203.0.113.4" });
    const b = await r.json();
    check(r.status === 201 && b.ok === true && b.notification === "sent", "201, notification sent", JSON.stringify(b));
    const [ins, notify] = logLines();
    const row = JSON.parse(ins?.body || "{}");
    check(ins?.kind === "insert" && ins.headers.prefer === "return=minimal", "insert with Prefer: return=minimal (no SELECT needed)");
    check(row.email === "real.buyer@example.com" && row.enquiry_type === "quote" && row.lead_source === "Category Page Enquiry", "row identity fields");
    check(row.product_id === "6" && row.product_name === "Guard Security Cabin", "product resolved from the catalogue", `${row.product_id} / ${row.product_name}`);
    check(/Quantity: 2/.test(row.message) && /PIN code: 635109/.test(row.message) && /Submitted from: \/products\/category\/security-cabins/.test(row.message), "message carries size/quantity/PIN/page");
    check(row.message.includes("<b>bold</b>"), "stored text is unchanged (escaping happens at output)");
    check(!("status" in row) && !("pipeline_stage" in row) && !("assigned_to" in row), "no workflow fields sent");
    const n = JSON.parse(notify?.body || "{}");
    check(notify?.kind === "notify" && !n.message.includes("<") && n.message.includes("‹b›bold"), "notification text is markup-inert");
  }

  console.log("\n4. The client cannot choose the product name");
  {
    fs.writeFileSync(LOG, "");
    await submit(goodFields({ email: "p1@example.com", model: "1" }), { ip: "203.0.113.5", extra: { product_name: "Injected" } });
    const row = JSON.parse(logLines()[0]?.body || "{}");
    check(row.product_id === null && /custom requirement/.test(row.product_name), "a model from ANOTHER category becomes a custom requirement", row.product_name);
  }

  console.log("\n5. Failure handling");
  {
    setMode("insert-fail");
    const r = await submit(goodFields({ email: "f1@example.com" }), { ip: "203.0.113.6" });
    check(r.status === 502, "database error → 502 with a friendly message", String(r.status));
    setMode("db-rate-limited");
    const r2 = await submit(goodFields({ email: "f2@example.com" }), { ip: "203.0.113.7" });
    check(r2.status === 429, "database 'rate_limited' → 429", String(r2.status));
    setMode("notify-fail");
    fs.writeFileSync(LOG, "");
    const r3 = await submit(goodFields({ email: "f3@example.com" }), { ip: "203.0.113.8" });
    const b3 = await r3.json();
    check(r3.status === 201 && b3.notification === "failed" && logLines()[0]?.kind === "insert", "e-mail failure → enquiry still stored, 201, notification failed");
    setMode("ok");
  }

  console.log("\n6. Rate limits");
  {
    // Same e-mail from different IPs: 3 accepted, 4th refused.
    const codes = [];
    for (let i = 0; i < 4; i++) codes.push((await submit(goodFields({ email: "repeat@example.com", phone: `98000000${i}1` }), { ip: `198.51.100.${i + 1}` })).status);
    check(codes.join() === "201,201,201,429", "per-email: 4th within 10 minutes → 429", codes.join());
    // Same IP, different people: 5 accepted, 6th refused, with Retry-After.
    const ipCodes = [];
    let last;
    for (let i = 0; i < 6; i++) {
      last = await submit(goodFields({ email: `ip${i}@example.com`, phone: `97000000${i}2` }), { ip: "198.51.100.50" });
      ipCodes.push(last.status);
    }
    check(ipCodes.join() === "201,201,201,201,201,429", "per-IP: 6th within 10 minutes → 429", ipCodes.join());
    check(Number(last.headers.get("retry-after")) > 0, "429 carries Retry-After", last.headers.get("retry-after"));
    // Any request counts toward the attempt cap: 20 bad requests, then the 21st is refused before validation.
    const attempt = [];
    for (let i = 0; i < 21; i++) attempt.push((await submit({}, { ip: "198.51.100.99" })).status);
    check(attempt.slice(0, 20).every((s) => s === 400) && attempt[20] === 429, "per-IP attempt cap: 21st request → 429", attempt.slice(-3).join());
    // X-Forwarded-For spoofing does not dodge the limit when X-Real-IP (set by nginx) is present.
    const spoof = await submit(goodFields({ email: "spoof@example.com", phone: "9600000003" }), {
      ip: "198.51.100.50",
      headers: { "X-Forwarded-For": "1.2.3.4" },
    });
    check(spoof.status === 429, "spoofed X-Forwarded-For ignored when X-Real-IP is set", String(spoof.status));
  }

  console.log(`\nenquiry-api-http.test.mjs — ${passed} passed, ${failed} failed`);
  process.exitCode = failed > 0 ? 1 : 0;
}
