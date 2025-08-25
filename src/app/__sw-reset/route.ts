import { NextResponse } from 'next/server';

export async function GET() {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Service Worker Reset - Fix ChunkLoadError</title>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 2rem; max-width: 700px; margin: 0 auto; line-height: 1.6; }
    .success { color: #059669; background: #d1fae5; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0; }
    .error { color: #dc2626; background: #fee2e2; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0; }
    .warning { color: #d97706; background: #fef3c7; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0; }
    .info { background: #dbeafe; color: #1e40af; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0; }
    button { background: #3b82f6; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; margin: 0.5rem 0.5rem 0.5rem 0; }
    button:hover { background: #2563eb; }
    .danger { background: #fecaca; color: #dc2626; }
    .danger:hover { background: #fca5a5; }
    code { background: #f3f4f6; padding: 0.2rem 0.4rem; border-radius: 0.25rem; font-family: monospace; }
    .steps { background: #f0f9ff; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0; }
  </style>
</head>
<body>
  <h1>🔧 Service Worker Reset - Fix ChunkLoadError</h1>
  
  <div class="info">
    <strong>What this fixes:</strong> ChunkLoadError, blank white pages, and stale asset loading issues.
    This happens when old service workers serve outdated JavaScript chunks that no longer exist.
  </div>

  <div class="warning">
    <strong>After using this tool:</strong> You must hard refresh the page (Ctrl+F5 or Cmd+Shift+R) 
    to see the fresh app without ChunkLoadError.
  </div>

  <div class="steps">
    <h3>📋 Steps to Fix:</h3>
    <ol>
      <li>Click "Reset Service Workers" below</li>
      <li>Wait for success message</li>
      <li>Go to your main page (e.g., /assistant)</li>
      <li>Hard refresh: <code>Ctrl+F5</code> (Windows) or <code>Cmd+Shift+R</code> (Mac)</li>
      <li>Page should load without ChunkLoadError</li>
    </ol>
  </div>

  <div id="status"></div>
  
  <button onclick="resetSW()">🔄 Reset Service Workers</button>
  <button onclick="checkSW()">🔍 Check Service Workers</button>
  <button onclick="clearAllCaches()" class="danger">🗑️ Clear All Caches</button>
  <button onclick="location.href='/'">🏠 Go Home</button>

  <script>
    async function resetSW() {
      const status = document.getElementById('status');
      status.innerHTML = '<div class="info">🔄 Resetting service workers...</div>';
      
      try {
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          
          if (registrations.length === 0) {
            status.innerHTML = '<div class="success">✅ No service workers found to unregister.</div>';
            return;
          }
          
          for (const registration of registrations) {
            await registration.unregister();
            console.log('Unregistered SW:', registration.scope);
          }
          
          status.innerHTML = '<div class="success">✅ Successfully unregistered ' + registrations.length + ' service worker(s).<br><br><strong>Next step:</strong> Go to your main page and hard refresh (Ctrl+F5 / Cmd+Shift+R) to see the fix.</div>';
        } else {
          status.innerHTML = '<div class="error">❌ Service Workers not supported in this browser.</div>';
        }
      } catch (error) {
        status.innerHTML = '<div class="error">❌ Error resetting service workers: ' + error.message + '</div>';
      }
    }

    async function checkSW() {
      const status = document.getElementById('status');
      
      try {
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          
          if (registrations.length === 0) {
            status.innerHTML = '<div class="success">✅ No active service workers found.</div>';
          } else {
            let swInfo = '<div class="warning"><strong>⚠️ Active Service Workers Found:</strong><br>';
            for (const registration of registrations) {
              swInfo += '- ' + registration.scope + '<br>';
            }
            swInfo += '<br>These may be causing ChunkLoadError. Click "Reset Service Workers" above.</div>';
            status.innerHTML = swInfo;
          }
        } else {
          status.innerHTML = '<div class="error">❌ Service Workers not supported in this browser.</div>';
        }
      } catch (error) {
        status.innerHTML = '<div class="error">❌ Error checking service workers: ' + error.message + '</div>';
      }
    }

    async function clearAllCaches() {
      const status = document.getElementById('status');
      status.innerHTML = '<div class="warning">🗑️ Clearing all caches...</div>';
      
      try {
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          let clearedCount = 0;
          
          for (const cacheName of cacheNames) {
            await caches.delete(cacheName);
            clearedCount++;
          }
          
          status.innerHTML = '<div class="success">✅ Cleared ' + clearedCount + ' cache(s).<br><br><strong>Next step:</strong> Go to your main page and hard refresh (Ctrl+F5 / Cmd+Shift+R).</div>';
        } else {
          status.innerHTML = '<div class="error">❌ Cache API not supported in this browser.</div>';
        }
      } catch (error) {
        status.innerHTML = '<div class="error">❌ Error clearing caches: ' + error.message + '</div>';
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
