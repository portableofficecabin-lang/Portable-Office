// Edge check for the nginx runbook (deploy/runbooks/nginx-h2-compression-redirects.md).
// Read-only: a handful of GET/HEAD requests, no cookies, no forms.
//
//   node scripts/seo/edge-check.mjs [--host portableofficecabin.com] [--json out.json]
//
// Reports, for the live host:
//   1. ALPN — does TLS negotiate HTTP/2 ("h2") or only HTTP/1.1?
//   2. Compression — Content-Encoding and bytes on the wire for HTML, a CSS file and a JS chunk,
//      when the client offers "br, gzip" (as every current browser does).
//   3. Redirect hops — http / www / trailing-slash variants, followed one hop at a time.
//   4. A neighbour check — the other site on the same nginx answers as before (status only).
import tls from "node:tls";
import https from "node:https";
import http from "node:http";
import { writeFileSync } from "node:fs";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const HOST = arg("--host", "portableofficecabin.com");
const JSON_OUT = arg("--json", "");
const NEIGHBOUR = arg("--neighbour", "builtontrustconstruction.com");
const UA = "Mozilla/5.0 (edge-check; read-only)";

function alpn(host) {
  return new Promise((resolve) => {
    const s = tls.connect({ host, port: 443, servername: host, ALPNProtocols: ["h2", "http/1.1"] }, () => {
      const out = { host, alpn: s.alpnProtocol || "none", tls: s.getProtocol() };
      s.end();
      resolve(out);
    });
    s.on("error", (e) => resolve({ host, error: String(e.message || e) }));
    s.setTimeout(15000, () => { s.destroy(); resolve({ host, error: "timeout" }); });
  });
}

/** One request, no redirect following, body counted as raw bytes on the wire. */
function get(url, { method = "GET", headers = {} } = {}) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const mod = u.protocol === "https:" ? https : http;
    const req = mod.request(u, { method, headers: { "user-agent": UA, ...headers } }, (res) => {
      let bytes = 0;
      res.on("data", (c) => (bytes += c.length));
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, bytes }));
    });
    req.on("error", (e) => resolve({ error: String(e.message || e) }));
    req.setTimeout(20000, () => { req.destroy(); resolve({ error: "timeout" }); });
    req.end();
  });
}

async function hops(start, max = 6) {
  const chain = [];
  let url = start;
  for (let i = 0; i < max; i++) {
    const r = await get(url, { method: "HEAD" });
    if (r.error) { chain.push({ url, error: r.error }); break; }
    chain.push({ url, status: r.status });
    if (r.status >= 300 && r.status < 400 && r.headers.location) url = new URL(r.headers.location, url).href;
    else break;
  }
  const last = chain[chain.length - 1];
  return { start, hops: chain.length - 1, final: last.url, finalStatus: last.status ?? last.error, chain };
}

const report = { host: HOST, at: new Date().toISOString() };

report.alpn = await alpn(HOST);

// HTML + the first CSS and JS asset the homepage references.
const home = await get(`https://${HOST}/`, { headers: { "accept-encoding": "identity" } });
const page = home.error ? "" : await new Promise((resolve) => {
  https.get(`https://${HOST}/`, { headers: { "user-agent": UA, "accept-encoding": "identity" } }, (res) => {
    let b = ""; res.setEncoding("utf8"); res.on("data", (c) => (b += c)); res.on("end", () => resolve(b));
  }).on("error", () => resolve(""));
});
const css = (page.match(/href="(\/_next\/static\/[^"]+\.css)"/) || [])[1];
const js = (page.match(/src="(\/_next\/static\/chunks\/[^"]+\.js)"/) || [])[1];
report.compression = [];
for (const [kind, path] of [["html", "/"], ["html", "/products/portable-cabin"], ["css", css], ["js", js]]) {
  if (!path) { report.compression.push({ kind, error: "asset not found in homepage HTML" }); continue; }
  const plain = await get(`https://${HOST}${path}`, { headers: { "accept-encoding": "identity" } });
  const comp = await get(`https://${HOST}${path}`, { headers: { "accept-encoding": "br, gzip" } });
  report.compression.push({
    kind, path,
    contentEncoding: comp.headers?.["content-encoding"] || "none",
    bytesOnWire: comp.bytes, bytesUncompressed: plain.bytes,
    vary: comp.headers?.vary || "", cacheStatus: comp.headers?.["x-cache-status"] || "",
    server: comp.headers?.server || "",
  });
}

report.redirects = [];
for (const start of [
  `http://${HOST}/`,
  `http://www.${HOST}/`,
  `https://www.${HOST}/`,
  `http://www.${HOST}/products/portable-cabin`,
  `https://${HOST}/products/portable-cabin/`,
  `http://www.${HOST}/products/portable-cabin/`,
]) report.redirects.push(await hops(start));

const nb = await get(`https://${NEIGHBOUR}/`, { method: "HEAD" });
report.neighbour = { host: NEIGHBOUR, status: nb.status ?? nb.error, alpn: (await alpn(NEIGHBOUR)).alpn };

if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify(report, null, 2));
console.log(`ALPN ${report.alpn.host}: ${report.alpn.alpn ?? report.alpn.error} (${report.alpn.tls ?? ""})`);
for (const c of report.compression) {
  console.log(c.error ? `compression ${c.kind}: ${c.error}` : `compression ${c.kind.padEnd(4)} ${c.path.slice(0, 60).padEnd(60)} ${c.contentEncoding.padEnd(5)} ${c.bytesOnWire} / ${c.bytesUncompressed} bytes`);
}
for (const r of report.redirects) console.log(`redirect ${r.start.padEnd(55)} → ${r.hops} hop(s) → ${r.final} (${r.finalStatus})`);
console.log(`neighbour ${report.neighbour.host}: ${report.neighbour.status}, ALPN ${report.neighbour.alpn}`);
