/* Standalone Math Platformer service worker
 *
 * Scope is /play/ only — coexists with the main app's SW at /. Strategy:
 *   - Same-origin GET requests: stale-while-revalidate. Hakan gets fast loads
 *     after the first visit AND fresh code lands within one refresh.
 *   - Cross-origin (Phaser CDN): pass through, browser handles it.
 *
 * Bump CACHE_VERSION when shipping changes that affect this page.
 */

const CACHE_VERSION = 'platformer-v211';
const SHELL_CACHE   = `${CACHE_VERSION}-shell`;

const SHELL_URLS = [
    './',
    './index.html',
    './manifest.json',
    '../minigames.js?v=211',
    '../style.css?v=211',
    '../hakan.jpg',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(SHELL_CACHE)
            .then((cache) => cache.addAll(SHELL_URLS).catch(() => {}))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys
                .filter((k) => k !== SHELL_CACHE && k.startsWith('platformer-'))
                .map((k) => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return; // browser handles CDN

    event.respondWith(
        caches.open(SHELL_CACHE).then((cache) =>
            cache.match(req).then((cached) => {
                const network = fetch(req).then((res) => {
                    if (res && res.status === 200) cache.put(req, res.clone());
                    return res;
                }).catch(() => cached);
                return cached || network;
            })
        )
    );
});
