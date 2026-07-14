/**
 * html2canvas (1.4.x) cannot parse modern CSS colour functions — oklch / oklab /
 * lab() / lch() / color(). Tailwind + shadcn theme tokens are authored in oklch(),
 * so ANY DOM→canvas export throws:
 *     "Attempting to parse an unsupported color function 'oklch'".
 *
 * Fix strategy (two layers):
 *  1. applySafeColors() — PRIMARY. Just before capture, walk the LIVE element subtree
 *     and rewrite any computed colour that uses an unsupported function to plain rgb via
 *     an inline style. getComputedStyle on the LIVE DOM always resolves oklch, so this is
 *     reliable (unlike reading the not-yet-styled html2canvas clone). Returns a cleanup
 *     that restores the previous inline values. The rewritten colours are the same colours
 *     in rgb, so there is no visible flash.
 *  2. sanitizeClonedDoc() — SECONDARY net, run in html2canvas's onclone hook.
 *
 * captureElementToCanvas() wires both together and is the one call sites should use.
 */

// html2canvas-pro is a drop-in fork of html2canvas that parses CSS Color 4 functions
// (oklch/oklab/lab/lch/color()) NATIVELY — so it renders Tailwind v4's oklch palette
// (including pseudo-elements, which inline-style sanitising can't reach) without throwing.
import html2canvas from "html2canvas-pro";

const UNSUPPORTED_COLOR = /(oklch|oklab|\blab\(|\blch\(|color\()/i;
/** Values that are only meaningful IN THE PAGE — they cannot survive standalone serialisation. */
const NEEDS_RESOLVE = /(var\(|currentcolor)/i;
const COLOR_PROPS = [
  "color", "background-color", "border-top-color", "border-right-color",
  "border-bottom-color", "border-left-color", "outline-color",
  "text-decoration-color", "column-rule-color", "caret-color", "fill", "stroke",
] as const;

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Paint properties that only exist on SVG nodes. These get a HARDER treatment than the
 * COLOR_PROPS above — see flattenSvgPaint().
 *
 * `color` is in the list even though it paints nothing itself: it is what `currentColor` resolves
 * against. Pinning it means a `currentColor` we failed to rewrite anywhere in the subtree still
 * lands on the right colour once the SVG is torn out of the page.
 */
const SVG_PAINT_PROPS = ["fill", "stroke", "stop-color", "flood-color", "lighting-color", "color"] as const;

/**
 * SVG paint must be flattened to a CONCRETE colour — unconditionally, not just when it uses an
 * unsupported colour function.
 *
 * html2canvas does not rasterise an inline <svg> as part of the DOM. It SERIALISES the <svg>
 * standalone and loads it as an <img> (data:image/svg+xml,…). That detached SVG document has no
 * access to the page's CSS custom properties, so a presentation attribute like
 *
 *     fill="hsl(var(--accent))"
 *
 * resolves against an undefined `--accent` inside the serialised image: the declaration is invalid
 * at computed-value time, `fill` falls back to black and `stroke` to none. The drawing exports as
 * black blobs with no outlines — and because the computed value on the LIVE DOM is already a plain
 * `rgb(...)`, it never matches UNSUPPORTED_COLOR, so the oklch sanitiser above never touches it.
 * The export SUCCEEDS and silently produces a wrong drawing, which is worse than throwing.
 *
 * getComputedStyle on the live DOM has already resolved the var() to concrete rgb, so copying that
 * value onto an inline style makes the serialised SVG self-contained. For a drawing that already
 * uses literal hex (ModulePlan, every labour-colony sheet) this is a visual no-op.
 *
 * NOTE: the resolved value depends on the ACTIVE THEME, and this app renders <html class="dark">.
 * Flattening therefore has to happen with the LIGHT palette in scope or the ink pinned here is the
 * dark theme's near-white foreground and the drawing comes out white-on-white. captureElementToCanvas
 * guarantees that ordering (forceLightTheme runs first); call sites no longer have to remember to put
 * a `light` class on their sheet.
 */
function flattenSvgPaint(node: Element, cs: CSSStyleDeclaration, set: (prop: string, val: string) => void) {
  for (const prop of SVG_PAINT_PROPS) {
    // The computed style is the primary source: the browser has already substituted var() and
    // resolved currentColor and inheritance for us. Fall back to the presentation attribute when it
    // comes back empty — getComputedStyle is not required to resolve paint on a node that is never
    // rendered (anything inside <defs>: gradient stops, patterns, markers, masks), and an empty
    // string there would otherwise leave the raw `hsl(var(--x))` in the serialised output.
    const computed = cs.getPropertyValue(prop);
    const raw = (computed && computed.trim()) || node.getAttribute(prop) || "";
    const val = raw.trim();
    // "none" is already self-contained. A paint-server reference (url(#grad)) must stay a reference —
    // the gradient's own <stop> nodes are flattened separately, by their own pass through this loop.
    if (!val || val === "none" || val.startsWith("url(")) continue;
    set(prop, resolvePaint(node, val));
  }
}

/**
 * Turn any paint value into one a DETACHED document can render: substitute the page's custom
 * properties, resolve currentColor, and collapse a CSS Color 4 function to plain rgb/hex.
 */
function resolvePaint(node: Element, value: string): string {
  let out = value;
  if (NEEDS_RESOLVE.test(out)) {
    const cs = window.getComputedStyle(node);
    // hsl(var(--accent)) → hsl(32 95% 52%). Custom properties inherit and resolve even on nodes
    // that are never painted, so this also works inside <defs>.
    out = out.replace(/var\(\s*(--[\w-]+)\s*(?:,([^()]*))?\)/gi, (_m, name: string, fallback?: string) => {
      const v = cs.getPropertyValue(name).trim();
      return v || (fallback ? fallback.trim() : "");
    });
    const currentColor = cs.getPropertyValue("color").trim();
    if (currentColor) out = out.replace(/currentcolor/gi, currentColor);
  }
  return UNSUPPORTED_COLOR.test(out) ? toRenderableColor(out) : out;
}

const isSvgNode = (node: Element): boolean => node.namespaceURI === SVG_NS;

/**
 * Pin every paint in an <svg> subtree to a concrete colour, IN PLACE, and return a cleanup that puts
 * the previous inline values back. This is what makes a serialised SVG self-contained — see the
 * flattenSvgPaint header. Exported so the standalone SVG exporter (lib/pdf/svgExport.ts) can reuse
 * the exact same logic instead of trusting that its drawings only ever use literal hex.
 *
 * For a drawing that already uses literal hex it is a visual no-op: the value it pins IS the value
 * that was already there.
 */
export function inlineSvgPaint(svg: SVGSVGElement, { forceLight = true }: CaptureOptions = {}): () => void {
  if (typeof window === "undefined") return () => {};
  // Same reason as the DOM capture path: resolve the tokens against the LIGHT palette, or a
  // token-painted drawing gets the dark theme's near-white ink pinned onto white paper.
  const restoreTheme = forceLight ? forceLightTheme(svg as unknown as HTMLElement) : () => {};
  const touched: Array<[SVGElement, string, string]> = [];
  const nodes = [svg, ...Array.from(svg.querySelectorAll<SVGElement>("*"))];
  for (const node of nodes) {
    if (!isSvgNode(node)) continue; // skip <foreignObject> HTML content
    const cs = window.getComputedStyle(node);
    flattenSvgPaint(node, cs, (prop, val) => {
      touched.push([node, prop, node.style.getPropertyValue(prop)]);
      node.style.setProperty(prop, val, "important");
    });
  }
  return () => {
    for (let i = touched.length - 1; i >= 0; i--) {
      const [node, prop, prev] = touched[i];
      if (prev) node.style.setProperty(prop, prev);
      else node.style.removeProperty(prop);
    }
    restoreTheme();
  };
}

/**
 * Force the LIGHT palette onto an export sheet for the duration of a capture.
 *
 * app/layout.tsx renders <html class="dark">, and src/index.css binds the dark palette on `:root`
 * as well — so a sheet that paints with theme tokens resolves `--foreground` to a NEAR-WHITE and
 * `--muted` to a NEAR-BLACK no matter how white its own background is (`bg-white` is a literal
 * utility; it does not re-bind custom properties). The sanitiser below then faithfully flattens
 * those dark-theme colours into the PDF, and the drawing prints as white-on-white text over a
 * black-filled shape. Adding `light` (src/index.css) re-binds the tokens inside the subtree to the
 * light palette, so the ink that gets flattened is dark ink on white paper.
 *
 * Applied to the LIVE node — the same node the sanitiser reads computed styles from — and undone in
 * a `finally`. A sheet that is already light (the cabin drawing sheet) is left untouched.
 */
function forceLightTheme(el: HTMLElement): () => void {
  const hadLight = el.classList.contains("light");
  const hadDark = el.classList.contains("dark");
  if (hadLight && !hadDark) return () => {};
  el.classList.add("light");
  el.classList.remove("dark");
  void el.offsetHeight; // flush the style recalc so getComputedStyle below sees the light tokens
  return () => {
    if (!hadLight) el.classList.remove("light");
    if (hadDark) el.classList.add("dark");
  };
}

let _canvas: HTMLCanvasElement | null = null;
/** Convert any CSS colour (incl. oklch/lab/…) to #rrggbb/rgba via the native canvas engine. */
export function toRenderableColor(value: string): string {
  if (typeof document === "undefined") return value;
  if (!_canvas) _canvas = document.createElement("canvas");
  const ctx = _canvas.getContext("2d");
  if (!ctx) return value;
  try {
    ctx.fillStyle = "#000000";
    ctx.fillStyle = value; // native canvas understands CSS Color 4 (oklch/lab/…)
    return ctx.fillStyle as string; // normalised to #rrggbb / rgba()
  } catch {
    return "#000000";
  }
}

function sanitizeOne(cs: CSSStyleDeclaration, set: (prop: string, val: string) => void) {
  for (const prop of COLOR_PROPS) {
    const val = cs.getPropertyValue(prop);
    if (val && UNSUPPORTED_COLOR.test(val)) set(prop, toRenderableColor(val));
  }
  const bs = cs.getPropertyValue("box-shadow");
  if (bs && UNSUPPORTED_COLOR.test(bs)) set("box-shadow", "none");
  const bi = cs.getPropertyValue("background-image");
  if (bi && UNSUPPORTED_COLOR.test(bi)) set("background-image", "none");
}

/**
 * Rewrite unsupported colours on the LIVE element subtree to rgb inline styles.
 * Returns a cleanup fn that restores the previous inline values (call it in `finally`).
 */
export function applySafeColors(root: HTMLElement): () => void {
  if (typeof window === "undefined") return () => {};
  const touched: Array<[HTMLElement, string, string]> = [];
  const nodes: HTMLElement[] = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
  for (const node of nodes) {
    const cs = window.getComputedStyle(node);
    const set = (prop: string, val: string) => {
      touched.push([node, prop, node.style.getPropertyValue(prop)]);
      node.style.setProperty(prop, val, "important");
    };
    sanitizeOne(cs, set);
    // SVG nodes need their paint pinned to a concrete colour even when it is already valid rgb,
    // because the <svg> is serialised standalone and loses the page's CSS variables. See flattenSvgPaint.
    if (isSvgNode(node)) flattenSvgPaint(node, cs, set);
  }
  // Reverse order: a prop written twice must be rewound to what it held BEFORE the first write.
  return () => {
    for (let i = touched.length - 1; i >= 0; i--) {
      const [node, prop, prev] = touched[i];
      if (prev) node.style.setProperty(prop, prev);
      else node.style.removeProperty(prop);
    }
  };
}

/** onclone secondary net: sanitize the cloned document (whole body, or a subtree by id). */
export function sanitizeClonedDoc(doc: Document, rootId?: string) {
  const win = doc.defaultView || (typeof window !== "undefined" ? window : null);
  if (!win) return;
  const root = (rootId ? doc.getElementById(rootId) : null) || doc.body;
  if (!root) return;
  const nodes: HTMLElement[] = [root as HTMLElement, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
  for (const node of nodes) {
    const cs = win.getComputedStyle(node);
    const set = (prop: string, val: string) => node.style.setProperty(prop, val);
    sanitizeOne(cs, set);
    if (isSvgNode(node)) flattenSvgPaint(node, cs, set);
  }
}

export interface CaptureOptions {
  /**
   * Re-bind the sheet's theme tokens to the LIGHT palette for the capture, so the PDF is dark ink on
   * white paper even while the site is in dark mode. Default true — see forceLightTheme().
   * Pass false only for a sheet that is deliberately meant to print dark.
   */
  forceLight?: boolean;
}

/** Capture an element to a canvas: light theme forced, then every colour flattened (both layers). */
export async function captureElementToCanvas(
  el: HTMLElement,
  opts: Record<string, unknown> = {},
  { forceLight = true }: CaptureOptions = {},
): Promise<HTMLCanvasElement> {
  // Order is load-bearing: the palette has to be swapped BEFORE the sanitiser reads computed styles,
  // or it would flatten the dark palette's near-white ink onto the page and "fix" it in place.
  const restoreTheme = forceLight ? forceLightTheme(el) : () => {};
  const restore = applySafeColors(el);
  try {
    return await html2canvas(el, { ...opts, onclone: (doc: Document) => sanitizeClonedDoc(doc) });
  } finally {
    restore();
    restoreTheme();
  }
}
