const CACHE_NAME = 'laam-wallet-cache-v1';
const urlsToCache = ['/', '/index.html', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

// Install & cache
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
  self.skipWaiting();
});

// Activate
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

// Fetch - offline-first
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(res => res)
      .catch(() => caches.match(event.request) || new Response("You are offline"))
  );
});

// Background Sync
self.addEventListener('sync', event => {
  if (event.tag === 'sync-actions') {
    event.waitUntil(syncActions());
  }
});

// IndexedDB helper inside SW
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('laam-wallet-db', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('actions')) {
        db.createObjectStore('actions', { autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getOfflineActions() {
  const db = await openDB();
  const tx = db.transaction('actions', 'readonly');
  const store = tx.objectStore('actions');
  return await store.getAll();
}

async function clearOfflineActions() {
  const db = await openDB();
  const tx = db.transaction('actions', 'readwrite');
  tx.objectStore('actions').clear();
  await tx.complete;
}

async function syncActions() {
  const actions = await getOfflineActions();
  for (const action of actions) {
    // Replace with real API call to server
    await fetch('/api/send-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action)
    });
  }
  await clearOfflineActions();
}
