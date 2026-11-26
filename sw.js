/* NEEOSOMA · SOMA~LINK — service worker
 * PWA: offline shell + installability.
 * Strategy:
 *   - navigations (HTML): network-first, fall back to cached index.html when offline
 *   - same-origin static assets (css/js/svg/png/ico/json/webmanifest): cache-first,
 *     then network (stale-while-revalidate) — app uses ?v= cache-busting so this is safe
 *   - cross-origin (Supabase, Telegram, fonts, Tailwind CDN): never cached (network only)
 */
const CACHE = 'soma-link-v1';
// Relative paths resolve against the service worker's own URL, so the shell
// precaches correctly whether the app is served from root or a subpath.
const PRECACHE = ['./', './manifest.webmanifest', './index.html'];

const STATIC_RE = /\.(?:css|js|mjs|svg|png|jpe?g|gif|webp|ico|json|webmanifest|woff2?|ttf|otf)$/i;

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE)
            .then((cache) => cache.addAll(PRECACHE))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);
    // Never touch cross-origin requests (Supabase API/RPC, Telegram, fonts, Tailwind CDN).
    if (url.origin !== self.location.origin) return;

    // Navigations: network-first, offline fallback to cached shell.
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req)
                .then((res) => {
                    const copy = res.clone();
                    caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
                    return res;
                })
                .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
        );
        return;
    }

    // Static assets: cache-first, stale-while-revalidate.
    if (STATIC_RE.test(url.pathname)) {
        event.respondWith(
            caches.match(req).then((cached) => {
                const network = fetch(req)
                    .then((res) => {
                        if (res && res.ok) {
                            const copy = res.clone();
                            caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
                        }
                        return res;
                    })
                    .catch(() => cached);
                return cached || network;
            })
        );
    }
});
