#!/usr/bin/env node
/**
 * QUALITY RATCHET — fails a pull request that ADDS TypeScript or ESLint errors, without
 * pretending the errors that already exist on main are fixed.
 *
 *   node scripts/ci/ratchet.mjs tsc              (npm run typecheck:ratchet)
 *   node scripts/ci/ratchet.mjs eslint           (npm run lint:ratchet)
 *   node scripts/ci/ratchet.mjs <tool> --update  rewrite the baseline after errors were FIXED
 *
 * WHY A RATCHET: main carries pre-existing errors (114 from `tsc --noEmit`, 391 from
 * `eslint .` when this was introduced — Deno edge functions, untyped admin views,
 * productImages.ts, …). A plain `tsc` / `eslint` gate would be red on every PR from day one and
 * get ignored. Instead, the errors are counted per (file, error code / rule) and compared with
 * the committed baseline in scripts/ci/baseline/<tool>.json:
 *   • any (file, code) pair with MORE errors than the baseline → FAIL, listing those errors;
 *   • pairs with FEWER errors → pass, and the run says the baseline can be lowered;
 *   • a file that is new, renamed or moved and has errors counts as new errors.
 * Line numbers are deliberately not part of the key, so editing a file with existing errors
 * does not fail the check; adding one more error of the same kind to that file does.
 *
 * Updating the baseline: only after FIXING errors (or after a rename that moved existing errors),
 * run with --update and commit the JSON. The diff shows exactly which counts changed, so a
 * reviewer can see a baseline that grows. Never raise the baseline to make a PR pass.
 *
 * Generated route types under .next/ (present only after a local `next build`) are ignored, so a
 * local run matches CI, which type-checks a clean checkout.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const [tool, ...flags] = process.argv.slice(2);
const update = flags.includes("--update");
if (tool !== "tsc" && tool !== "eslint") {
  console.error("usage: node scripts/ci/ratchet.mjs <tsc|eslint> [--update]");
  process.exit(2);
}
const BASELINE = join(ROOT, "scripts", "ci", "baseline", `${tool}.json`);
const toRepoPath = (p) => relative(ROOT, p).split(sep).join("/");

/** @returns {{ key: string, file: string, line: string }[]} one entry per error */
function runTsc() {
  const tscBin = join(ROOT, "node_modules", "typescript", "bin", "tsc");
  const res = spawnSync(process.execPath, [tscBin, "--noEmit", "--pretty", "false", "--incremental", "false"], {
    cwd: ROOT, encoding: "utf8", maxBuffer: 256 * 1024 * 1024,
  });
  if (res.error) throw res.error;
  const out = `${res.stdout}\n${res.stderr}`;
  const errors = [];
  for (const raw of out.split(/\r?\n/)) {
    const m = raw.match(/^(.+?)\((\d+),(\d+)\): error (TS\d+): /);
    if (m) {
      const file = toRepoPath(join(ROOT, m[1]));
      if (file.startsWith(".next/")) continue;
      errors.push({ key: `${file}|${m[4]}`, file, line: raw.trim() });
    } else if (/^error TS\d+:/.test(raw)) {
      // global errors (bad tsconfig, missing lib) — never in the baseline, always fail
      errors.push({ key: `<global>|${raw.match(/TS\d+/)[0]}`, file: "<global>", line: raw.trim() });
    }
  }
  if (res.status !== 0 && errors.length === 0) {
    console.error(out.slice(0, 4000));
    throw new Error(`tsc exited with ${res.status} but no errors could be parsed`);
  }
  return errors;
}

function runEslint() {
  const eslintBin = join(ROOT, "node_modules", "eslint", "bin", "eslint.js");
  const dir = mkdtempSync(join(tmpdir(), "eslint-ratchet-"));
  const outFile = join(dir, "eslint.json");
  try {
    const res = spawnSync(process.execPath, [eslintBin, ".", "--format", "json", "--output-file", outFile], {
      cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
    });
    if (res.error) throw res.error;
    // eslint exits 1 when it found errors (expected) and 2 when it could not run (config/crash)
    if (res.status === 2 || !existsSync(outFile)) {
      console.error(`${res.stdout}\n${res.stderr}`.slice(0, 4000));
      throw new Error(`eslint could not run (exit ${res.status})`);
    }
    const errors = [];
    for (const f of JSON.parse(readFileSync(outFile, "utf8"))) {
      const file = toRepoPath(f.filePath);
      for (const m of f.messages) {
        if (m.severity !== 2) continue; // warnings never fail lint, so they are not ratcheted
        const rule = m.ruleId ?? (m.fatal ? "parse-error" : "unknown");
        errors.push({ key: `${file}|${rule}`, file, line: `${file}:${m.line}:${m.column}  ${rule}  ${m.message}` });
      }
    }
    return errors;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const errors = tool === "tsc" ? runTsc() : runEslint();
const counts = {};
for (const e of errors) counts[e.key] = (counts[e.key] ?? 0) + 1;
const sorted = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));

if (update) {
  mkdirSync(dirname(BASELINE), { recursive: true });
  const body = {
    tool,
    note: "Pre-existing errors tolerated by scripts/ci/ratchet.mjs. Counts may only go DOWN; see the header of ratchet.mjs.",
    total: errors.length,
    errors: sorted,
  };
  writeFileSync(BASELINE, `${JSON.stringify(body, null, 2)}\n`);
  console.log(`${tool}: baseline written — ${errors.length} errors in ${Object.keys(sorted).length} (file, code) pairs → ${toRepoPath(BASELINE)}`);
  process.exit(0);
}

if (!existsSync(BASELINE)) {
  console.error(`${tool}: no baseline at ${toRepoPath(BASELINE)} — run with --update on main first`);
  process.exit(2);
}
const baseline = JSON.parse(readFileSync(BASELINE, "utf8"));
const base = baseline.errors ?? {};

const increased = [];
const decreased = [];
for (const key of new Set([...Object.keys(base), ...Object.keys(sorted)])) {
  const was = base[key] ?? 0;
  const now = sorted[key] ?? 0;
  if (now > was) increased.push({ key, was, now });
  else if (now < was) decreased.push({ key, was, now });
}

console.log(`${tool}: ${errors.length} errors now, ${baseline.total} in the baseline (pre-existing errors are tolerated, new ones are not)`);

if (decreased.length) {
  console.log(`\n${tool}: ${decreased.length} (file, code) pair(s) have FEWER errors than the baseline — thank you.`);
  for (const d of decreased) console.log(`  ${d.key}: ${d.was} → ${d.now}`);
  console.log(`  Lower the baseline in this PR: node scripts/ci/ratchet.mjs ${tool} --update  (then commit scripts/ci/baseline/${tool}.json)`);
}

if (increased.length) {
  console.log(`\n${tool}: FAILED — ${increased.length} (file, code) pair(s) have MORE errors than the baseline:`);
  for (const inc of increased) {
    console.log(`\n  ${inc.key}: ${inc.was} in baseline → ${inc.now} now`);
    for (const e of errors.filter((x) => x.key === inc.key)) console.log(`    ${e.line}`);
  }
  console.log(`\nFix the new errors above: ${increased.reduce((n, i) => n + i.now - i.was, 0)} new (each listing shows every error of that kind in the file).`);
  if (process.env.GITHUB_ACTIONS) {
    for (const inc of increased) console.log(`::error title=${tool} ratchet::${inc.key} has ${inc.now} errors (baseline ${inc.was})`);
  }
  process.exit(1);
}
console.log(`\n${tool}: OK — no new errors.`);
