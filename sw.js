self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
    // Empty fetch handler allows the PWA install prompt to fire
});
