// Service Worker for Briki - handles chunk caching and updates
const CACHE_NAME = 'briki-v1';
const CHUNK_CACHE_NAME = 'briki-chunks-v1';
const STATIC_CACHE_NAME = 'briki-static-v1';

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/offline.html',
        '/favicon.ico'
      ]);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches and take control
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== CHUNK_CACHE_NAME && 
              cacheName !== STATIC_CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - handle different types of requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle chunk requests with build-aware caching
  if (url.pathname.startsWith('/_next/static/chunks/')) {
    event.respondWith(handleChunkRequest(request));
    return;
  }

  // Handle static assets with long-term caching
  if (url.pathname.startsWith('/_next/static/') || 
      url.pathname.startsWith('/_next/image/')) {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  // Handle API requests - no caching
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle HTML pages - no caching to prevent stale chunk references
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(handleHtmlRequest(request));
    return;
  }

  // Default handling for other requests
  event.respondWith(handleDefaultRequest(request));
});

// Handle chunk requests with build-aware caching
async function handleChunkRequest(request) {
  try {
    // Always try network first for chunks
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache the successful response
      const cache = await caches.open(CHUNK_CACHE_NAME);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    // If network fails, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Serving chunk from cache:', request.url);
      return cachedResponse;
    }
    
    // If both fail, return network response (will show error)
    return networkResponse;
  } catch (error) {
    console.error('[SW] Error handling chunk request:', error);
    
    // Try cache as fallback
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return error response
    return new Response('Chunk loading failed', { status: 500 });
  }
}

// Handle static assets with long-term caching
async function handleStaticRequest(request) {
  try {
    // Check cache first for static assets
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If not in cache, fetch and cache
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Error handling static request:', error);
    return new Response('Static asset loading failed', { status: 500 });
  }
}

// Handle API requests - no caching
async function handleApiRequest(request) {
  try {
    return await fetch(request);
  } catch (error) {
    console.error('[SW] Error handling API request:', error);
    return new Response('API request failed', { status: 500 });
  }
}

// Handle HTML requests - no caching to prevent stale chunks
async function handleHtmlRequest(request) {
  try {
    // Always fetch fresh HTML to ensure latest chunk references
    const response = await fetch(request);
    
    // Don't cache HTML responses
    return response;
  } catch (error) {
    console.error('[SW] Error handling HTML request:', error);
    
    // Return offline page if available
    const offlineResponse = await caches.match('/offline.html');
    if (offlineResponse) {
      return offlineResponse;
    }
    
    return new Response('Page loading failed', { status: 500 });
  }
}

// Handle default requests
async function handleDefaultRequest(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Error handling default request:', error);
    return new Response('Request failed', { status: 500 });
  }
}

// Handle message events from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

// Handle push notifications (if needed in the future)
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received:', event);
  // Handle push notifications here
});

// Handle notification clicks (if needed in the future)
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  // Handle notification clicks here
});
