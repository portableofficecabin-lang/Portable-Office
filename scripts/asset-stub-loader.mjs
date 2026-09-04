/**
 * NODE LOADER SHIM — lets a plain `node`/`tsx` harness import application modules that
 * statically import image assets.
 *
 * src/data/products.ts imports a handful of `.webp` / `.png` files, because Next fingerprints
 * and optimises static imports. Outside the Next build there is no asset pipeline, so Node
 * throws ERR_UNKNOWN_FILE_EXTENSION the moment a harness imports the catalogue — which is why
 * the data-level tests could not reach it before.
 *
 * This hook returns the SAME SHAPE Next's own loader does — `{ src, width, height, blurDataURL }`
 * — with `src` pointing at the bundler-style path (`/_next/static/media/<file>`) so that
 * resolveImageUrl() and the feed's stabilizeImageUrl() behave in a harness exactly as they do in
 * the app. It is test-only: nothing in `app/` or `src/` imports it, and it never runs in a build.
 *
 * Registered via scripts/asset-stub-register.mjs:
 *   node --import tsx --import ./scripts/asset-stub-register.mjs scripts/<harness>.ts
 */

const ASSET_RE = /\.(webp|png|jpe?g|gif|svg|avif|ico|bmp)(\?.*)?$/i;

export async function load(url, context, nextLoad) {
  if (!ASSET_RE.test(url)) return nextLoad(url, context);

  const fileName = decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "asset");
  // The eight-hex-char fingerprint Next inserts is irrelevant to every assertion these
  // harnesses make; a stable literal keeps runs reproducible.
  const src = `/_next/static/media/${fileName.replace(/\.(\w+)$/, ".00000000.$1")}`;

  return {
    format: "module",
    shortCircuit: true,
    source: `export default ${JSON.stringify({ src, width: 800, height: 800, blurDataURL: "" })};`,
  };
}
