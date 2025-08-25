import { NextResponse } from 'next/server';

export async function GET() {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Service Worker Reset</title>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 2rem; max-width: 600px; margin: 0 auto; }
    .success { color: #059669; background: #d1fae5; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0; }
    .error { color: #dc2626; background: #fee2e2; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0; }
    button { background: #3b82f6; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; margin: 0.5rem 0.5rem 0.5rem 0; }
    button:hover { background: #2563eb; }
    .info { background: #dbeafe; color: #1e40af; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0; }
  </style>
</head>
<body>
  <h1>Service Worker Reset</h1>
  
  <div class="info">
    <strong>What this does:</strong> Unregisters any existing service workers that might be serving stale assets.
    This can help resolve ChunkLoadError issues after deployments.
  </div>

  <div id="status"></div>
  
  <button onclick="resetSW()">Reset Service Workers</button>
  <button onclick="checkSW()">Check Service Workers</button>
  <button onclick="location.href='/'">Go Home</button>

  <script>
    async function resetSW() {
      const status = document.getElementById('status');
      status.innerHTML = '<div class="info">Resetting service workers...</div>';
      
      try {
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          
          if (registrations.length === 0) {
            status.innerHTML = '<div class="success">No service workers found to unregister.</div>';
            return;
          }
          
          for (const registration of registrations) {
            await registration.unregister();
          }
          
          status.innerHTML = '<div class="success">Successfully unregistered ' + registrations.length + ' service worker(s).<br><br>Please refresh the page to see changes.</div>';
        } else {
          status.innerHTML = '<div class="error">Service Workers not supported in this browser.</div>';
        }
      } catch (error) {
        status.innerHTML = '<div class="error">Error resetting service workers: ' + error.message + '</div>';
      }
    }

    async function checkSW() {
      const status = document.getElementById('status');
      
      try {
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          
          if (registrations.length === 0) {
            status.innerHTML = '<div class="success">No active service workers found.</div>';
          } else {
            let swInfo = '<div class="info"><strong>Active Service Workers:</strong><br>';
            for (const registration of registrations) {
              swInfo += '- ' + registration.scope + ' (Active: ' + registration.active + ')<br>';
            }
            swInfo += '</div>';
            status.innerHTML = swInfo;
          }
        } else {
          status.innerHTML = '<div class="error">Service Workers not supported in this browser.</div>';
        }
      } catch (error) {
        status.innerHTML = '<div class="error">Error checking service workers: ' + error.message + '</div>';
      }
    }

    // Auto-check on load
    checkSW();
  </script>
</body>
</html>
  `;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
