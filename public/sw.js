/**
 * Maellis Service Worker v3
 *
 * Caching strategies:
 * - CacheFirst: static assets (JS, CSS, images, fonts)
 * - StaleWhileRevalidate: API read endpoints (GET)
 * - NetworkFirst: critical API writes (POST/PUT/DELETE), navigation
 *
 * Additional features:
 * - Background Sync for offline queue
 * - Push notifications with VAPID
 * - Periodic background sync for email/calendar
 */

const CACHE_VERSION = 'maellis-v3';
const STATIC_CACHE = 'maellis-static-v3';
const API_CACHE = 'maellis-api-v3';
const RUNTIME_CACHE = 'maellis-runtime-v3';

const STATIC_ASSETS = ['/', '/logo.svg', '/manifest.json'];

// API routes that should use NetworkFirst (critical writes)
const CRITICAL_API_PREFIXES = [
  '/api/tasks',
  '/api/invoices',
  '/api/time-entries',
  '/api/projects',
  '/api/emails',
  '/api/contracts',
  '/api/meetings',
  '/api/offline',
];

// API routes that should never be cached
const NO_CACHE_ROUTES = [
  '/api/notifications/stream',
  '/api/auth',
  '/api/stripe/webhook',
  '/api/stripe/portal',
];

// Maximum cache age for API responses (5 minutes)
const API_MAX_AGE = 5 * 60 * 1000;

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => ![STATIC_CACHE, API_CACHE, RUNTIME_CACHE].includes(name))
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests for caching (POST/PUT handled separately)
  if (event.request.method !== 'GET') {
    // For POST/PUT/DELETE, try network first, queue if offline
    if (isCriticalWrite(event.request)) {
      event.respondWith(networkFirstWithOfflineQueue(event.request));
    }
    return;
  }

  // Never cache certain routes
  if (NO_CACHE_ROUTES.some((route) => url.pathname.startsWith(route))) return;

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) return;

  // Navigation requests: NetworkFirst
  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(event.request));
    return;
  }

  // Static assets: CacheFirst
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // API read endpoints: StaleWhileRevalidate with max age
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  // Everything else: NetworkFirst with cache fallback
  event.respondWith(networkFirst(event.request));
});

// ─── Caching Strategies ──────────────────────────────────────────────────────

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
    if (request.mode === 'navigate') {
      return caches.match('/');
    }
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(API_CACHE);
  const cached = await cache.match(request);

  // Check if cached response is too old
  if (cached) {
    const cacheTime = cached.headers.get('sw-cache-time');
    if (cacheTime && Date.now() - parseInt(cacheTime, 10) > API_MAX_AGE) {
      // Remove stale entry
      cache.delete(request);
    }
  }

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        // Clone and add cache timestamp
        const cloned = response.clone();
        const headers = new Headers(cloned.headers);
        headers.set('sw-cache-time', String(Date.now()));
        const cachedResponse = new Response(cloned.body, {
          status: cloned.status,
          statusText: cloned.statusText,
          headers,
        });
        cache.put(request, cachedResponse);
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    if (request.mode === 'navigate') {
      return caches.match('/');
    }
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return caches.match('/');
  }
}

async function networkFirstWithOfflineQueue(request) {
  try {
    return await fetch(request);
  } catch {
    // Network failed — tell client to queue the action
    const clients = await self.clients.matchAll({ type: 'window' });
    for (const client of clients) {
      client.postMessage({
        type: 'OFFLINE_ACTION_QUEUED',
        url: request.url,
        method: request.method,
      });
    }
    return new Response(
      JSON.stringify({ queued: true, message: 'Action mise en file d\'attente hors-ligne' }),
      {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|svg|gif|ico|woff|woff2|ttf|eot)$/.test(pathname);
}

function isCriticalWrite(request) {
  return request.method !== 'GET' &&
    CRITICAL_API_PREFIXES.some((prefix) =>
      new URL(request.url).pathname.startsWith(prefix)
    );
}

// ─── Push Notifications ──────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {
    title: 'Maellis',
    body: 'Nouvelle notification',
    icon: '/logo.svg',
    badge: '/logo.svg',
    tag: 'maellis-notification',
    url: '/',
    type: 'info',
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
    tag: data.tag || `maellis-${Date.now()}`,
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

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});

// ─── Background Sync ─────────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline') {
    event.waitUntil(syncOfflineActions());
  }

  if (event.tag === 'sync-emails') {
    event.waitUntil(syncEmails());
  }

  if (event.tag === 'sync-calendar') {
    event.waitUntil(syncCalendar());
  }
});

async function syncOfflineActions() {
  // Notify clients to trigger their IndexedDB sync
  const clients = await self.clients.matchAll({ type: 'window' });
  for (const client of clients) {
    client.postMessage({ type: 'TRIGGER_OFFLINE_SYNC' });
  }
}

async function syncEmails() {
  try {
    const response = await fetch('/api/emails/sync', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (response.ok) {
      const data = await response.json();
      if (data.imported > 0) {
        self.registration.showNotification('Maellis — Emails synchronisés', {
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
        self.registration.showNotification('Maellis — Calendrier synchronisé', {
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

// ─── Message Handler (from clients) ──────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'REGISTER_SYNC') {
    self.registration.sync.register('sync-offline').catch(() => {
      // Background sync not supported
    });
  }
});
