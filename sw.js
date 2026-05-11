/* Hakan's Math Practice — service worker
 *
 * Strategy:
 *   - App shell (HTML, CSS, JS, manifest, hakan.jpg) -> cache on install,
 *     stale-while-revalidate at runtime so updates from main land within
 *     one extra refresh.
 *   - Audio MP3s + manifest.json -> cache-first with on-demand population.
 *     We don't pre-cache 500MB of audio; clips get cached the first time
 *     they're played, then come from cache forever.
 *
 * Bump CACHE_VERSION whenever the app shell changes so old caches purge.
 */

const CACHE_VERSION = 'hakans-math-v178';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const AUDIO_CACHE = `${CACHE_VERSION}-audio`;

const SHELL_URLS = [
    './',
    './index.html',
    './style.css',
    './audio.js',
    './modules.js',
    './game.js',
    './manifest.json',
    './hakan.jpg',
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
                .filter((k) => k !== SHELL_CACHE && k !== AUDIO_CACHE)
                .map((k) => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    // Audio: cache-first, lazily populated
    if (url.pathname.includes('/audio/')) {
        event.respondWith(
            caches.open(AUDIO_CACHE).then((cache) =>
                cache.match(req).then((cached) =>
                    cached || fetch(req).then((res) => {
                        // Only cache successful, complete responses
                        if (res && res.status === 200 && res.type === 'basic') {
                            cache.put(req, res.clone());
                        }
                        return res;
                    }).catch(() => cached || Response.error())
                )
            )
        );
        return;
    }

    // For HTML / navigation requests: network-first so cache busters work
    // (otherwise returning cached index.html locks Hakan onto whichever
    // ?v=NN it was last cached with, even after we bump scripts).
    const accept = req.headers.get('accept') || '';
    const isHtml = req.mode === 'navigate' || accept.includes('text/html');
    if (isHtml) {
        event.respondWith(
            fetch(req).then((res) => {
                if (res && res.status === 200) {
                    const clone = res.clone();
                    caches.open(SHELL_CACHE).then((c) => c.put(req, clone));
                }
                return res;
            }).catch(() => caches.match(req).then((cached) => cached || new Response('Offline', {status: 503})))
        );
        return;
    }

    // Other shell assets (CSS, JS, images, JSON): stale-while-revalidate
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
