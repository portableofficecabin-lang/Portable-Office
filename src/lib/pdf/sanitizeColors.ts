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

import html2canvas from "html2canvas";

const UNSUPPORTED_COLOR = /(oklch|oklab|\blab\(|\blch\(|color\()/i;
const COLOR_PROPS = [
  "color", "background-color", "border-top-color", "border-right-color",
  "border-bottom-color", "border-left-color", "outline-color",
  "text-decoration-color", "column-rule-color", "caret-color", "fill", "stroke",
] as const;

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
    sanitizeOne(cs, (prop, val) => {
      touched.push([node, prop, node.style.getPropertyValue(prop)]);
      node.style.setProperty(prop, val, "important");
    });
  }
  return () => {
    for (const [node, prop, prev] of touched) {
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
    sanitizeOne(cs, (prop, val) => node.style.setProperty(prop, val));
  }
}

/** Capture an element to a canvas with oklch/lab colour-sanitisation applied (both layers). */
export async function captureElementToCanvas(
  el: HTMLElement,
  opts: Record<string, unknown> = {},
): Promise<HTMLCanvasElement> {
  const restore = applySafeColors(el);
  try {
    return await html2canvas(el, { ...opts, onclone: (doc: Document) => sanitizeClonedDoc(doc) });
  } finally {
    restore();
  }
}
