// Fake `next build` for deploy/test/integration.sh. Mirrors what the deploy script relies on:
// it empties .next EXCEPT .next/cache (as Next does), writes BUILD_ID, prerender-manifest.json
// for every city slug, its own hashed static chunk, and a webpack-cache marker. It imports a
// devDependency, so the build fails if `npm ci` skipped devDependencies (the NODE_ENV bug).
// Faults are read from fault.txt (one per line): build-fail | not-prerendered:<slug> | serve-404:<slug>
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { toolVersion } from "fake-build-tool";

const faults = existsSync("fault.txt") ? readFileSync("fault.txt", "utf8").split("\n").map((s) => s.trim()).filter(Boolean) : [];
if (faults.includes("build-fail")) {
  console.error("fake build: failing on purpose (fault.txt: build-fail)");
  process.exit(1);
}

mkdirSync(".next", { recursive: true });
for (const e of readdirSync(".next")) if (e !== "cache") rmSync(join(".next", e), { recursive: true, force: true });

const slugs = [...readFileSync("src/data/cityPages.ts", "utf8").matchAll(/^[ \t]+slug: "([a-z0-9-]+)"/gm)].map((m) => m[1]);
const notPrerendered = faults.filter((f) => f.startsWith("not-prerendered:")).map((f) => f.split(":")[1]);
const serve404 = faults.filter((f) => f.startsWith("serve-404:")).map((f) => f.split(":")[1]);
const id = randomBytes(10).toString("hex");

writeFileSync(".next/BUILD_ID", id);
// When the build ran: the fake server reports it as builtAt from GET /api/build-info, as the
// real build inlines it (next.config.ts, "DEPLOYMENT IDENTITY").
writeFileSync(".next/BUILT_AT", new Date().toISOString());
const routes = { "/": {}, "/cities-we-serve": {} };
for (const s of slugs) if (!notPrerendered.includes(s)) routes[`/cities-we-serve/${s}`] = { initialRevalidateSeconds: 3600 };
writeFileSync(".next/prerender-manifest.json", JSON.stringify({ version: 4, routes }, null, 2));
writeFileSync(".next/serve.json", JSON.stringify({ slugs: slugs.filter((s) => !serve404.includes(s)) }));

mkdirSync(`.next/static/${id}`, { recursive: true });
mkdirSync(".next/static/chunks", { recursive: true });
writeFileSync(`.next/static/${id}/_buildManifest.js`, `self.__BUILD_MANIFEST={id:"${id}"};`);
writeFileSync(`.next/static/chunks/page-${id}.js`, `console.log("chunk of build ${id}");`);

mkdirSync(".next/cache/webpack", { recursive: true });
writeFileSync(`.next/cache/webpack/build-${id}`, new Date().toISOString());

console.log(`fake build: BUILD_ID ${id}, ${slugs.length} city pages, build tool ${toolVersion}`);
