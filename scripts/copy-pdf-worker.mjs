// Robustly copy a pdf.js worker into /public as /pdf.worker.js (or noop).
import fs from "node:fs";
import path from "node:path";

const CWD = process.cwd();
const BUILD_DIR = path.join(CWD, "node_modules", "pdfjs-dist", "build");
const DEST_DIR = path.join(CWD, "public");
const DEST = path.join(DEST_DIR, "pdf.worker.js");

// Try common worker filenames in priority order.
const CANDIDATES = [
  "pdf.worker.min.mjs",
  "pdf.worker.mjs",
  "pdf.worker.min.js",
  "pdf.worker.js",
];

function firstExisting(base, candidates) {
  for (const f of candidates) {
    const p = path.join(base, f);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

try {
  const src = firstExisting(BUILD_DIR, CANDIDATES);
  fs.mkdirSync(DEST_DIR, { recursive: true });

  if (src) {
    fs.copyFileSync(src, DEST);
    console.log(`[copy-pdf-worker] Copied ${path.basename(src)} → /public/pdf.worker.js`);
  } else {
    // Do NOT fail the build—viewer will use CDN fallback at runtime.
    console.warn("[copy-pdf-worker] No worker file found in pdfjs-dist/build; using CDN fallback at runtime.");
  }
  process.exit(0);
} catch (err) {
  // Never hard-fail the install on worker copy.
  console.warn("[copy-pdf-worker] Non-fatal error:", err?.message || err);
  process.exit(0);
}


