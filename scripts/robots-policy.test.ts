/**
 * ROBOTS POLICY REGRESSION TEST — guards the Merchant Center "User cannot complete purchase" fix
 * (PR #13). Run with:  npx tsx scripts/robots-policy.test.ts   (npm run robots:test)
 *
 * Evaluates app/robots.ts with GOOGLE'S OWN semantics — a crawler obeys only the single most
 * specific matching user-agent group (an exact product-token group beats "*", with NO inheritance),
 * then within that group the LONGEST matching rule wins and Allow wins length ties. This is exactly
 * the trap this test exists to catch: an innocent-looking `Allow: /products` (9 chars) added to a
 * Google group would OUT-RANK `Disallow: /*?page=` (8 chars) and silently re-open pagination crawl,
 * and a rule dropped from a Google group does NOT fall back to `*` — it becomes allowed.
 *
 * FAILS (exit 1) if any of these regress:
 *   • Storebot-Google or Googlebot loses crawl access to /cart or /checkout
 *     (→ every Merchant Center offer is disapproved again);
 *   • /products?page=2 (or any ?page=/&page= URL) becomes crawlable for anyone;
 *   • /admin/ becomes crawlable for anyone;
 *   • /api/ becomes crawlable for anyone — EXCEPT /api/merchant-feed, which must stay allowed
 *     for everyone (Google's feed fetcher obeys robots.txt);
 *   • the default `User-agent: *` policy drifts from its intended shape (cart/checkout blocked
 *     for ordinary bots, and the exact expected disallow set).
 */

import robotsFn from "../app/robots";

/* ---------------------------------------------------------------- normalize Next's shape ----- */

interface Rule {
  type: "allow" | "disallow";
  path: string;
}
interface Group {
  agents: string[];
  rules: Rule[];
}

const meta = robotsFn();
const rawRules = Array.isArray(meta.rules) ? meta.rules : [meta.rules];
const groups: Group[] = rawRules.map((r) => {
  const agents = (Array.isArray(r.userAgent) ? r.userAgent : [r.userAgent ?? "*"]).map((a) =>
    String(a).toLowerCase(),
  );
  const rules: Rule[] = [];
  for (const p of Array.isArray(r.allow) ? r.allow : r.allow ? [r.allow] : []) {
    rules.push({ type: "allow", path: String(p) });
  }
  for (const p of Array.isArray(r.disallow) ? r.disallow : r.disallow ? [r.disallow] : []) {
    rules.push({ type: "disallow", path: String(p) });
  }
  return { agents, rules };
});

/* ---------------------------------------------------------------- Google-semantics matcher --- */

/** robots pattern match: literal prefix with "*" wildcards and an optional trailing "$" anchor. */
function globMatch(pat: string, path: string): boolean {
  let anchored = false;
  if (pat.endsWith("$")) {
    anchored = true;
    pat = pat.slice(0, -1);
  }
  const parts = pat.split("*");
  let pos = 0;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part === "") continue;
    const at = i === 0 ? (path.startsWith(part) ? 0 : -1) : path.indexOf(part, pos);
    if (at < 0) return false;
    pos = at + part.length;
  }
  if (anchored && parts[parts.length - 1] !== "" && pos !== path.length) return false;
  return true;
}

/** The one group a crawler obeys: most specific product-token match, else the `*` group. */
function pickGroup(ua: string): Group | undefined {
  const u = ua.toLowerCase();
  return (
    groups.find((g) => g.agents.some((a) => a !== "*" && u.includes(a))) ??
    groups.find((g) => g.agents.includes("*"))
  );
}

function isAllowed(ua: string, path: string): boolean {
  const g = pickGroup(ua);
  if (!g) return true;
  let best: Rule | null = null;
  for (const r of g.rules) {
    if (!globMatch(r.path, path)) continue;
    if (
      !best ||
      r.path.length > best.path.length ||
      (r.path.length === best.path.length && r.type === "allow")
    ) {
      best = r;
    }
  }
  return !best || best.type === "allow";
}

/* ---------------------------------------------------------------- assertions ----------------- */

let passed = 0;
let failed = 0;
const fail = (msg: string) => {
  failed++;
  console.log(`  FAIL  ${msg}`);
};
const check = (cond: boolean, msg: string) => {
  if (cond) {
    passed++;
    console.log(`  PASS  ${msg}`);
  } else {
    fail(msg);
  }
};

const GOOGLE_BOTS = ["Storebot-Google", "Googlebot"];
const GENERIC_BOTS = ["*", "bingbot", "AhrefsBot"]; // anything without its own group obeys `*`
const EVERYONE = [...GOOGLE_BOTS, ...GENERIC_BOTS];

// 1. Google's bots MUST be able to walk the purchase path.
for (const ua of GOOGLE_BOTS) {
  check(isAllowed(ua, "/cart"), `${ua} can crawl /cart`);
  check(isAllowed(ua, "/checkout"), `${ua} can crawl /checkout`);
  check(isAllowed(ua, "/products/executive-portable-cabin-20ft"), `${ua} can crawl a product page`);
  check(isAllowed(ua, "/products"), `${ua} can crawl /products`);
}

// 2. Pagination URLs stay blocked for EVERYONE (non-canonical crawl noise).
for (const ua of EVERYONE) {
  check(!isAllowed(ua, "/products?page=2"), `${ua} blocked on /products?page=2`);
  check(!isAllowed(ua, "/products/category/portable-cabins?page=3"), `${ua} blocked on category ?page=`);
  check(!isAllowed(ua, "/products?category=x&page=2"), `${ua} blocked on &page=`);
}

// 3. /admin/ stays blocked for EVERYONE.
for (const ua of EVERYONE) {
  check(!isAllowed(ua, "/admin/"), `${ua} blocked on /admin/`);
  check(!isAllowed(ua, "/admin/orders"), `${ua} blocked on /admin/orders`);
}

// 4. /api/ stays blocked for EVERYONE — except /api/merchant-feed, allowed for EVERYONE.
for (const ua of EVERYONE) {
  check(!isAllowed(ua, "/api/orders"), `${ua} blocked on /api/orders`);
  check(!isAllowed(ua, "/api/"), `${ua} blocked on /api/`);
  check(isAllowed(ua, "/api/merchant-feed"), `${ua} ALLOWED on /api/merchant-feed`);
}

// 5. The default `*` policy must not drift: ordinary bots still cannot crawl cart/checkout …
for (const ua of GENERIC_BOTS) {
  check(!isAllowed(ua, "/cart"), `${ua} (default policy) blocked on /cart`);
  check(!isAllowed(ua, "/checkout"), `${ua} (default policy) blocked on /checkout`);
  check(isAllowed(ua, "/products/executive-portable-cabin-20ft"), `${ua} still crawls product pages`);
}

// … and the `*` group's disallow set is exactly what we ship today. A missing entry silently
// opens a private area; an added entry silently hides public content. Both must be deliberate —
// if you intended the change, update EXPECTED_STAR_DISALLOWS here in the same commit.
const EXPECTED_STAR_DISALLOWS = [
  "/admin/", "/api/", "/auth/", "/login", "/register", "/forgot-password",
  "/reset-password", "/my-account", "/*?page=", "/*&page=", "/cart", "/checkout",
].sort();
const starGroup = groups.find((g) => g.agents.includes("*"));
const actualStarDisallows = (starGroup?.rules ?? [])
  .filter((r) => r.type === "disallow")
  .map((r) => r.path)
  .sort();
check(
  JSON.stringify(actualStarDisallows) === JSON.stringify(EXPECTED_STAR_DISALLOWS),
  `\`User-agent: *\` disallow set unchanged (${actualStarDisallows.length} entries)`,
);

// The three groups themselves must exist — a deleted Google group falls back to `*` and
// instantly re-breaks the Merchant Center purchase check.
check(!!groups.find((g) => g.agents.includes("storebot-google")), "Storebot-Google group exists");
check(!!groups.find((g) => g.agents.includes("googlebot")), "Googlebot group exists");
check(!!starGroup, "`*` group exists");

/* ---------------------------------------------------------------- report --------------------- */

console.log(`\nrobots-policy.test.ts — ${passed} passed, ${failed} failed`);
if (failed) {
  console.log(
    "\nRobots policy REGRESSED. If Storebot-Google/Googlebot lost /cart or /checkout, every\n" +
      "Merchant Center offer will be disapproved again (\"User cannot complete purchase\").",
  );
  process.exit(1);
}
