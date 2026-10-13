# Pull-request checks and branch protection for `main`

## What runs on every pull request

`.github/workflows/pr-checks.yml` runs four jobs on every pull request into `main`, and again on every push to `main`. The workflow has **no path filter**, so a content-only PR still proves that the site builds.

| Check (job) | What it proves | Typical time |
|---|---|---|
| `lint` | ESLint: **no new errors** compared with `scripts/ci/baseline/eslint.json` | ~1–2 min |
| `typecheck` | `tsc --noEmit`: **no new errors** compared with `scripts/ci/baseline/tsc.json` | ~2–3 min |
| `test` | Unit tests in `src/**/*.test.ts` (guest cart, order totals, commerce identity), the robots policy, product variants, the container-office cluster, Razorpay env and signature checks, the static SEO audit, the BOQ golden baseline, and the colony and animation studios | ~2–3 min |
| `build` | `next build`, then `next start`. Every sitemap URL must answer 200 with clean canonicals and redirects (`seo:audit`), and every city page must be fully server-rendered (`cities:audit`) | ~8–12 min |

**Pre-existing errors are not fixed.** When these checks were introduced, `main` had 114 TypeScript errors (45 in `productImages.ts`, 44 in the Deno edge functions under `supabase/functions`, 4 in the test files that import `vitest`, and 21 in admin, calculator and other views) and 391 ESLint errors (376 of them `no-explicit-any`, mostly in admin views). `scripts/ci/ratchet.mjs` tolerates exactly those errors. It fails only when a file gains errors of a given code or rule. To record a fix and lower the baseline, run `node scripts/ci/ratchet.mjs tsc --update` (or `eslint --update`) and commit the JSON. **Never raise the baseline to get a PR through.**

**Deployment is unchanged.** `deploy-hostinger.yml` still deploys on every push to `main`, and nothing in it was modified. The new workflow has read-only permissions and uses no secrets.

## Proposed branch protection for `main` (owner action — not applied)

> Protected branches and rulesets on a **private** repository need GitHub Pro, Team or Enterprise. On GitHub Free they are available for public repositories only. Without protection the checks still run and show on every PR; they are just not enforced.

Apply this only **after the checks have run once** (open any PR). GitHub lists a check for selection only after it has reported in the last 7 days.

**Settings → Rules → Rulesets → New branch ruleset** (or the classic **Settings → Branches → Add rule** for `main`):

| Setting | Proposed value | Why |
|---|---|---|
| Target | default branch (`main`) | |
| Require a pull request before merging | **on**, required approvals **0** | PRs are opened from the owner's own account, and GitHub does not allow approving your own PR. The PR still has to exist and pass its checks. |
| Require status checks to pass | **on**: `lint`, `typecheck`, `test`, `build` | The four jobs above |
| Require branches to be up to date before merging | **off** (for now) | Several city-page PRs are usually open at once. With this on, every merge forces each other PR to update and re-run the ~10-minute build. Turn it on later if merges begin to break `main`. |
| Block force pushes | **on** | Protects history (CLAUDE.md) |
| Restrict deletions | **on** | |
| Bypass list | **Repository admin** (ruleset) / leave "Do not allow bypassing" **off** (classic) | Keeps an emergency path for the owner. Note that edits made in the GitHub web editor will offer "create a branch and open a PR" instead of committing straight to `main`. |
| Do **not** require `robots-policy` | — | That workflow is path-filtered. As a required check it would never report on most PRs and would block them forever. Its test already runs in `test`. |

Equivalent API call (classic protection), for reference:

```bash
gh api -X PUT repos/portableofficecabin-lang/Portable-Office/branches/main/protection \
  -H "Accept: application/vnd.github+json" --input - <<'EOF'
{
  "required_status_checks": {
    "strict": false,
    "checks": [{ "context": "lint" }, { "context": "typecheck" }, { "context": "test" }, { "context": "build" }]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": { "required_approving_review_count": 0 },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF
```

## Known gaps (not covered by these checks)

- **The anonymous purchase-flow browser regression** in CLAUDE.md (320 px and 1440 px, guest cart, checkout hydration, PIN code transport, payment button) still has to be run by hand when Cart, Checkout, pricing or product identity change. It needs a real browser and a payment sandbox.
- `npm run variants:http` currently **fails on `main`** (60 of 427 assertions). It still expects the container-office size pages (`/products/container-office/<size>`) to be indexable, priced variants. They are now unpriced and `noindex`, so the test must be brought in line with that product decision before it can become a check.
- The Merchant URL audit and the live-site probes run against production, so they belong after deployment, not in PR checks.
- GitHub Actions minutes: one PR run costs about 15–20 runner-minutes. That is free for public repositories and counts against the plan's monthly allowance for private ones.
