self.addEventListener('install', (event) => {
    console.log('[FluxiveProxy] Service Worker Installed');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('[FluxiveProxy] Service Worker Activated');
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Pass-through proxy for VisionSync validation
    event.respondWith(fetch(event.request));
});
