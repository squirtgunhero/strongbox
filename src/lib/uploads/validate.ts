// MIME-type guard for user-uploaded files. The browser-supplied `file.type`
// can be spoofed, so we verify the file's magic bytes server-side and reject
// anything that doesn't match an allowlist of safe document/image formats.
//
// XSS attack we're closing: a borrower uploads `payoff.svg` containing
// `<script>fetch('/api/...')...</script>`. The admin later opens the signed
// URL in their browser; Supabase serves it from a same-site origin or a CDN
// origin that can read app cookies / supabase tokens, and the script runs in
// the admin's session. PDFs/images can't execute, .html/.svg can.

const ALLOWED_MIMES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/webp",
  "image/tiff",
  // Office docs — safe at rest because we serve as attachments and never inline-render
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
]);

// First-bytes signatures keyed by mime. We require at least one to match.
const MAGIC: Array<{ mime: string; signature: number[]; offset?: number }> = [
  { mime: "application/pdf", signature: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { mime: "image/jpeg", signature: [0xff, 0xd8, 0xff] },
  { mime: "image/png", signature: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/webp", signature: [0x57, 0x45, 0x42, 0x50], offset: 8 },
  { mime: "image/tiff", signature: [0x49, 0x49, 0x2a, 0x00] }, // little-endian
  { mime: "image/tiff", signature: [0x4d, 0x4d, 0x00, 0x2a] }, // big-endian
  // Office formats: ZIP for OOXML, OLE2 for legacy
  { mime: "application/zip", signature: [0x50, 0x4b, 0x03, 0x04] }, // .docx/.xlsx
  { mime: "application/x-ole", signature: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] }, // legacy
];

const DENY_EXTENSIONS = new Set([
  ".html",
  ".htm",
  ".svg",
  ".xml",
  ".xhtml",
  ".js",
  ".mjs",
  ".cjs",
  ".sh",
  ".bat",
  ".cmd",
  ".exe",
  ".dll",
  ".so",
  ".jsp",
  ".php",
  ".py",
  ".rb",
]);

export interface ValidatedUpload {
  ok: boolean;
  reason?: string;
}

/**
 * Validate an incoming uploaded file. Checks:
 *  - extension is not on the denylist (HTML/SVG/script types)
 *  - browser-reported mime is on the allowlist
 *  - magic-byte signature in the first 16 bytes matches one of the allowed
 *    formats (catches mime spoofing)
 *  - HEIC/HEIF and CSV/TXT skip magic-byte check because they have no fixed
 *    signature; we still enforce extension + reported mime.
 */
export async function validateUpload(file: File): Promise<ValidatedUpload> {
  if (!file || !file.name) {
    return { ok: false, reason: "No file provided" };
  }

  const lowerName = file.name.toLowerCase();
  const ext = lowerName.includes(".")
    ? lowerName.slice(lowerName.lastIndexOf("."))
    : "";
  if (DENY_EXTENSIONS.has(ext)) {
    return { ok: false, reason: `Disallowed file type: ${ext}` };
  }

  if (file.type && !ALLOWED_MIMES.has(file.type)) {
    return { ok: false, reason: `Disallowed MIME type: ${file.type}` };
  }

  // Magic-byte check on the first 16 bytes.
  const buf = new Uint8Array(await file.slice(0, 16).arrayBuffer());

  // Plain text / csv / heic have no reliable magic — accept if extension is sane.
  const magicSkip =
    file.type === "text/plain" ||
    file.type === "text/csv" ||
    file.type === "image/heic" ||
    file.type === "image/heif";
  if (magicSkip) return { ok: true };

  const match = MAGIC.some((m) => {
    const offset = m.offset ?? 0;
    if (buf.length < offset + m.signature.length) return false;
    return m.signature.every((b, i) => buf[offset + i] === b);
  });
  if (!match) {
    return { ok: false, reason: "File contents do not match its declared type" };
  }
  return { ok: true };
}
