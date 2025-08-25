import { NextResponse } from 'next/server'

export async function GET() {
  const html = `
    <!doctype html><meta charset="utf-8">
    <script>
      (async () => {
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const r of regs) { try { await r.unregister(); } catch(e){} }
          caches && caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
        }
        location.href = '/';
      })();
    </script>
    Removing old service workers...
  `;
  return new NextResponse(html, { headers: { 'content-type': 'text/html' }});
}
