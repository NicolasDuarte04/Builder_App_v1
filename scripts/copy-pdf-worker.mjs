import { copyFile, mkdir, access } from 'fs/promises';
import { constants } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const root = resolve(__dirname, '..');
const prefer = async (paths) => {
  for (const p of paths) {
    try {
      await access(p, constants.R_OK);
      return p;
    } catch {}
  }
  return null;
};

const srcMJS = await prefer([
  resolve(root, 'node_modules/pdfjs-dist/build/pdf.worker.mjs'),
  resolve(root, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs'),
]);
const dstMJS = resolve(root, 'public/pdf.worker.mjs');

await mkdir(resolve(root, 'public'), { recursive: true });
if (!srcMJS) {
  throw new Error('Could not locate pdf.worker.mjs in pdfjs-dist');
}
await copyFile(srcMJS, dstMJS).catch(async (e) => {
  console.error('Could not copy pdf.worker.mjs', e);
  throw e;
});

// Optional classic fallback (best-effort)
const srcJS = await prefer([
  resolve(root, 'node_modules/pdfjs-dist/build/pdf.worker.js'),
  resolve(root, 'node_modules/pdfjs-dist/build/pdf.worker.min.js'),
]);
const dstJS = resolve(root, 'public/pdf.worker.js');
if (srcJS) {
  await copyFile(srcJS, dstJS).catch(() => {});
}

console.log('Copied pdf.js workers to /public');


