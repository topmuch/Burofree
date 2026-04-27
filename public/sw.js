const CACHE_NAME = 'burofree-v2';
const STATIC_CACHE = 'burofree-static-v2';
const API_CACHE = 'burofree-api-v2';
const STATIC_ASSETS = ['/', '/logo.svg', '/manifest.json'];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== API_CACHE)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Fetch: strategy based on request type
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // SSE stream requests should never be cached
  if (url.pathname === '/api/notifications/stream') return;

  // API requests: stale-while-revalidate
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  // Static assets: cache-first
  event.respondWith(cacheFirst(event.request));
});

// Cache-first strategy for static assets
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Return offline fallback for navigation
    if (request.mode === 'navigate') {
      return caches.match('/');
    }
    return new Response('Offline', { status: 503 });
  }
}

// Stale-while-revalidate strategy for API requests
async function staleWhileRevalidate(request) {
  const cache = await caches.open(API_CACHE);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

// Push notification handler
self.addEventListener('push', (event) => {
  let data = {
    title: 'Burofree',
    body: 'Nouvelle notification',
    icon: '/logo.svg',
    badge: '/logo.svg',
    tag: 'burofree-notification',
    url: '/',
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/logo.svg',
    badge: data.badge || '/logo.svg',
    tag: data.tag || `burofree-${Date.now()}`,
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      type: data.type || 'info',
    },
    actions: [
      { action: 'open', title: 'Ouvrir' },
      { action: 'dismiss', title: 'Ignorer' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Open new window if none found
      return self.clients.openWindow(targetUrl);
    })
  );
});

// Background sync handler
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-emails') {
    event.waitUntil(syncEmails());
  }

  if (event.tag === 'sync-calendar') {
    event.waitUntil(syncCalendar());
  }
});

async function syncEmails() {
  try {
    const response = await fetch('/api/emails/sync', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (response.ok) {
      const data = await response.json();
      if (data.imported > 0) {
        self.registration.showNotification('Burofree — Emails synchronisés', {
          body: `${data.imported} nouvel${data.imported > 1 ? 'aux' : ''} email${data.imported > 1 ? 's' : ''} importé${data.imported > 1 ? 's' : ''}`,
          icon: '/logo.svg',
          tag: 'sync-emails',
        });
      }
    }
  } catch {
    // Sync failed, will retry on next sync event
  }
}

async function syncCalendar() {
  try {
    const response = await fetch('/api/calendar/sync', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (response.ok) {
      const data = await response.json();
      const total = (data.synced || 0) + (data.updated || 0);
      if (total > 0) {
        self.registration.showNotification('Burofree — Calendrier synchronisé', {
          body: `${total} événement${total > 1 ? 's' : ''} synchronisé${total > 1 ? 's' : ''}`,
          icon: '/logo.svg',
          tag: 'sync-calendar',
        });
      }
    }
  } catch {
    // Sync failed, will retry on next sync event
  }
}
