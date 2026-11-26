import { createHash } from "node:crypto";

/**
 * Text-level helpers for scripts/seo/sitemap-lastmod.ts: cut one version of src/data/cityPages.ts
 * into its page blocks and hash each block's copy, ignoring comments and whitespace.
 * Pure (no git, no file system) so the test can exercise them directly.
 */

/** Remove // and /* *\/ comments without touching string contents (URLs contain "//"). */
export function stripComments(src: string): string {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      while (j < src.length && src[j] !== c) j += src[j] === "\\" ? 2 : 1;
      out += src.slice(i, j + 1);
      i = j + 1;
    } else if (c === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n") i++;
    } else if (c === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      i = end < 0 ? src.length : end + 2;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

/**
 * slug → hash of the normalised text of every page block in one version of cityPages.ts.
 * A block is an entry of the CITY_PAGES array written as a line `  {` … a line `  },` (two-space
 * indent, the file's layout). A version that cannot be cut this way yields an empty map.
 */
export function blockHashes(source: string): Map<string, string> {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const start = lines.findIndex((l) => /^export const CITY_PAGES\b/.test(l));
  const map = new Map<string, string>();
  if (start < 0) return map;
  let buf: string[] | null = null;
  for (let k = start + 1; k < lines.length; k++) {
    const l = lines[k];
    if (buf === null) {
      if (l === "  {") buf = [l];
      else if (/^\];/.test(l)) break;
      continue;
    }
    buf.push(l);
    if (/^ {2}\},?\s*$/.test(l)) {
      const block = buf.join("\n");
      const slug = block.match(/^ {4}slug:\s*"([^"]+)"/m)?.[1];
      if (slug) {
        const norm = stripComments(block).replace(/\s+/g, " ").replace(/,\s*([}\]])/g, "$1").trim();
        map.set(slug, createHash("sha256").update(norm).digest("hex"));
      }
      buf = null;
    }
  }
  return map;
}
