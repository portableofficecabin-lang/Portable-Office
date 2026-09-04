/**
 * UPLOAD VALIDATION — runs on the SERVER, on the actual bytes.
 *
 * A browser-declared `file.type` is a suggestion, not a fact: it is set by the OS from the file
 * extension and is trivially forged. So every check here reads the FILE SIGNATURE (magic bytes)
 * and treats the declared MIME type as, at most, a cross-check. A .exe renamed to .jpg fails on
 * the signature, which is the only test that means anything.
 *
 * Limits are deliberately modest. These are reference photographs for a video prompt, not a photo
 * archive: 12 MB is generous for a phone photo and small enough that a hostile upload cannot fill
 * the bucket.
 */

export const MAX_IMAGE_BYTES = 12 * 1024 * 1024; // 12 MB
export const MAX_ASSETS_PER_PROJECT = 12;
export const MIN_IMAGE_DIMENSION = 320;
export const MAX_IMAGE_DIMENSION = 8192;

export const ACCEPTED_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export type AcceptedImageMime = (typeof ACCEPTED_IMAGE_MIME)[number];

/** What the file input advertises. Kept in step with ACCEPTED_IMAGE_MIME. */
export const ACCEPT_ATTRIBUTE = ACCEPTED_IMAGE_MIME.join(",");

export interface SniffResult {
  ok: boolean;
  mime: AcceptedImageMime | null;
  /** Human-readable reason, safe to show the visitor. */
  reason?: string;
  width?: number;
  height?: number;
}

const startsWith = (buf: Uint8Array, sig: number[], offset = 0): boolean =>
  sig.every((b, i) => buf[offset + i] === b);

const ascii = (buf: Uint8Array, offset: number, length: number): string =>
  String.fromCharCode(...buf.subarray(offset, offset + length));

/**
 * Identify an image from its first bytes and read its intrinsic size.
 *
 * Dimensions are parsed from the container headers rather than by decoding the image — decoding an
 * attacker-supplied file to find out how big it is, is exactly the decompression-bomb the size
 * check is meant to prevent. JPEG needs a short segment walk; the rest are fixed offsets.
 */
export function sniffImage(bytes: Uint8Array): SniffResult {
  if (bytes.length < 32) return { ok: false, mime: null, reason: "The file is too small to be an image." };

  // PNG — 89 50 4E 47 0D 0A 1A 0A, IHDR width/height at 16/20 big-endian.
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return withSize("image/png", readU32BE(bytes, 16), readU32BE(bytes, 20));
  }

  // JPEG — FF D8 FF. Walk the segment chain to the SOFn frame header.
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    const dims = jpegSize(bytes);
    return withSize("image/jpeg", dims?.width, dims?.height);
  }

  // RIFF....WEBP
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && ascii(bytes, 8, 4) === "WEBP") {
    const dims = webpSize(bytes);
    return withSize("image/webp", dims?.width, dims?.height);
  }

  // ISO-BMFF branded AVIF: ....ftypavif / ftypavis / ftypmif1 with an avif compatible brand.
  if (ascii(bytes, 4, 4) === "ftyp") {
    const brand = ascii(bytes, 8, 4);
    if (brand === "avif" || brand === "avis" || brand === "mif1") {
      // AVIF dimensions live in an ispe box inside meta/iprp/ipco; a full parse is not worth it
      // here — sharp reads them accurately after the signature has already been accepted.
      return { ok: true, mime: "image/avif" };
    }
  }

  return {
    ok: false,
    mime: null,
    reason: "That file is not a JPEG, PNG, WebP or AVIF image. Please upload a photograph or render.",
  };
}

function withSize(mime: AcceptedImageMime, width?: number, height?: number): SniffResult {
  if (width && height) {
    if (width < MIN_IMAGE_DIMENSION || height < MIN_IMAGE_DIMENSION) {
      return {
        ok: false,
        mime,
        width,
        height,
        reason: `That image is ${width}×${height}. Please upload at least ${MIN_IMAGE_DIMENSION}px on the short edge so the building reads clearly.`,
      };
    }
    if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
      return {
        ok: false,
        mime,
        width,
        height,
        reason: `That image is ${width}×${height}, which is larger than we accept. Please resize it below ${MAX_IMAGE_DIMENSION}px.`,
      };
    }
  }
  return { ok: true, mime, width, height };
}

const readU32BE = (b: Uint8Array, o: number): number =>
  ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
const readU16BE = (b: Uint8Array, o: number): number => (b[o] << 8) | b[o + 1];
const readU16LE = (b: Uint8Array, o: number): number => b[o] | (b[o + 1] << 8);
const readU24LE = (b: Uint8Array, o: number): number => b[o] | (b[o + 1] << 8) | (b[o + 2] << 16);

function jpegSize(b: Uint8Array): { width: number; height: number } | null {
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = b[i + 1];
    // SOF0..SOF15 except the DHT/JPG/DAC markers (C4, C8, CC) carry the frame dimensions.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: readU16BE(b, i + 5), width: readU16BE(b, i + 7) };
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd9)) {
      i += 2;
      continue;
    }
    const len = readU16BE(b, i + 2);
    if (len < 2) return null;
    i += 2 + len;
  }
  return null;
}

function webpSize(b: Uint8Array): { width: number; height: number } | null {
  const fourcc = ascii(b, 12, 4);
  if (fourcc === "VP8X") return { width: readU24LE(b, 24) + 1, height: readU24LE(b, 27) + 1 };
  if (fourcc === "VP8L") {
    const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (fourcc === "VP8 ") return { width: readU16LE(b, 26) & 0x3fff, height: readU16LE(b, 28) & 0x3fff };
  return null;
}

export interface FileCheck {
  ok: boolean;
  /** Safe to render to the visitor verbatim. */
  reason?: string;
  mime?: AcceptedImageMime;
  width?: number;
  height?: number;
}

/** The whole gate: size, then signature, then dimensions, then declared-type cross-check. */
export function validateImageUpload(
  bytes: Uint8Array,
  declaredMime: string | undefined,
  declaredSize: number,
): FileCheck {
  if (declaredSize > MAX_IMAGE_BYTES || bytes.length > MAX_IMAGE_BYTES) {
    const mb = (Math.max(declaredSize, bytes.length) / (1024 * 1024)).toFixed(1);
    return {
      ok: false,
      reason: `That file is ${mb} MB. The limit is ${MAX_IMAGE_BYTES / (1024 * 1024)} MB — please resize or re-export it.`,
    };
  }
  if (bytes.length === 0) return { ok: false, reason: "That file is empty." };

  const sniffed = sniffImage(bytes);
  if (!sniffed.ok || !sniffed.mime) {
    return { ok: false, reason: sniffed.reason ?? "That file is not a supported image." };
  }

  // A mismatch between the claimed type and the real one is not fatal (browsers get it wrong on
  // AVIF and HEIC-converted files), but the REAL type is what gets stored and served.
  const declared = (declaredMime ?? "").split(";")[0].trim().toLowerCase();
  if (declared && declared !== sniffed.mime && ACCEPTED_IMAGE_MIME.includes(declared as AcceptedImageMime)) {
    // Both are acceptable types — trust the bytes, no error.
  }

  return { ok: true, mime: sniffed.mime, width: sniffed.width, height: sniffed.height };
}

/**
 * PROHIBITED-INPUT SCREEN — text side.
 *
 * The brief asks for an "unsafe or prohibited input" state. We cannot moderate an image without a
 * moderation provider, and pretending to would be worse than not claiming it — so this screens
 * the TEXT the visitor controls (prompt, title, voice-over, outro), which is what actually
 * reaches a third-party API from this form, and the provider's own safety filter remains the
 * authority on imagery. A rejection here is explicit about which rule was hit.
 */
const PROHIBITED_PATTERNS: { pattern: RegExp; reason: string }[] = [
  {
    pattern: /\b(nude|nsfw|porn|sexual|erotic)\b/i,
    reason: "Sexual content is not permitted in this tool.",
  },
  {
    pattern: /\b(gore|beheading|mutilat\w*|torture)\b/i,
    reason: "Graphic violence is not permitted in this tool.",
  },
  {
    pattern: /\b(bomb|explosive device|ied|detonat\w*)\b/i,
    reason: "This tool cannot be used to depict weapons or explosives.",
  },
  {
    pattern: /\b(deepfake|impersonat\w*)\b/i,
    reason: "This tool cannot be used to impersonate a real person or organisation.",
  },
];

export function screenText(text: string): { ok: boolean; reason?: string } {
  const value = (text ?? "").trim();
  if (!value) return { ok: true };
  for (const { pattern, reason } of PROHIBITED_PATTERNS) {
    if (pattern.test(value)) return { ok: false, reason };
  }
  return { ok: true };
}

/** Max characters accepted in any single free-text field, so a prompt cannot become a payload. */
export const MAX_TEXT_LENGTH = 4000;

export function clampText(text: unknown, max = MAX_TEXT_LENGTH): string {
  return String(text ?? "").slice(0, max);
}
